-- path: migrations/0000_extensions.sql
-- STEP_00 batch 4: shared functions. Core PostgreSQL only; no contrib
-- extensions are required so the same file runs on PGlite and Supabase.

-- ---------------------------------------------------------------------------
-- uuid_generate_v7(): time-ordered UUIDs (RFC 9562 layout) using only core
-- functions, so it works without uuid-ossp or pgcrypto.
-- ---------------------------------------------------------------------------
create or replace function uuid_generate_v7()
returns uuid
language plpgsql
volatile
parallel safe
as $$
declare
  ts_hex   text;
  rand_hex text;
begin
  ts_hex   := lpad(to_hex((extract(epoch from clock_timestamp()) * 1000)::bigint), 12, '0');
  rand_hex := md5(random()::text || clock_timestamp()::text || random()::text);
  return (
       substr(ts_hex, 1, 8) || '-' || substr(ts_hex, 9, 4)
    || '-7' || substr(rand_hex, 2, 3)
    || '-' || substr('89ab', 1 + floor(random() * 4)::int, 1) || substr(rand_hex, 6, 3)
    || '-' || substr(rand_hex, 9, 12)
  )::uuid;
end;
$$;

-- ---------------------------------------------------------------------------
-- set_updated_at(): BEFORE UPDATE trigger keeping updated_at honest.
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tenant settings readers used by every RLS policy in the platform.
-- ---------------------------------------------------------------------------
create or replace function current_company_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.company_id', true), '')::uuid;
$$;

create or replace function current_app_user_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.user_id', true), '')::uuid;
$$;

create or replace function is_platform_admin()
returns boolean
language sql
stable
as $$
  select coalesce(current_setting('app.platform_admin', true), '') = 'true';
$$;

-- ---------------------------------------------------------------------------
-- apply_base_rls(p_table): enable + force RLS and attach the named deny
-- policy. The deny policy is PERMISSIVE with qual false: it grants nothing to
-- anyone, which is what "default deny" means under Postgres' permissive-or /
-- restrictive-and semantics. (See STEP_00_COMPLETED.md; CONTRACTS.md sample
-- corrected from 'as restrictive' because a restrictive false policy would
-- deny even explicitly granted permissive policies.)
-- ---------------------------------------------------------------------------
create or replace function apply_base_rls(p_table regclass)
returns void
language plpgsql
as $$
declare
  tname text := (select relname from pg_class where oid = p_table);
begin
  execute format('alter table %s enable row level security', p_table);
  execute format('alter table %s force row level security', p_table);
  execute format('drop policy if exists %I on %s', format('deny_all_%s', tname), p_table);
  execute format(
    'create policy %I on %s for all to public using (false) with check (false)',
    format('deny_all_%s', tname), p_table
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- audit_trigger(): append-only audit row per DML statement, hash-chained
-- through audit_log_hash_chain so silent edits/deletions are detectable.
-- Defined here; audit tables are created in 0003 and the function validates
-- at first call, which happens only after tables exist.
-- ---------------------------------------------------------------------------
create or replace function audit_trigger()
returns trigger
language plpgsql
as $$
declare
  v_old     jsonb;
  v_new     jsonb;
  v_row_id  uuid;
  v_company uuid;
  v_actor   uuid;
  v_corr    text;
  v_prev    text;
  v_hash    text;
  v_audit   uuid;
  v_chain   uuid := '00000000-0000-7000-8000-000000000001';
begin
  -- The audit store is created in 0003 while tables carrying this trigger
  -- are created (and seeded) from 0001 onward. Rows touched before the audit
  -- system exists cannot be logged; skip cleanly instead of failing. The
  -- check is a catalog lookup, cheap and correct.
  if to_regclass('public.audit_logs') is null
     or to_regclass('public.audit_log_hash_chain') is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    v_new := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
  else
    v_old := to_jsonb(old);
  end if;

  v_row_id := coalesce(
    nullif(coalesce(v_new, v_old) ->> 'id', '')::uuid,
    '00000000-0000-0000-0000-000000000000'
  );
  v_company := coalesce(
    nullif(coalesce(v_new, v_old) ->> 'company_id', '')::uuid,
    nullif(current_setting('app.company_id', true), '')::uuid
  );
  v_actor := nullif(current_setting('app.user_id', true), '')::uuid;
  v_corr := nullif(current_setting('app.correlation_id', true), '');

  select last_hash into v_prev
    from audit_log_hash_chain
   where id = v_chain
   for update;

  if not found then
    insert into audit_log_hash_chain (id, last_hash) values (v_chain, '')
    on conflict (id) do nothing;
    v_prev := '';
  end if;

  v_hash := md5(
    v_prev || '|' || tg_table_schema || '.' || tg_table_name || '|' || tg_op
    || '|' || coalesce(v_row_id::text, '')
    || '|' || coalesce(v_old::text, '')
    || '|' || coalesce(v_new::text, '')
  );

  insert into audit_logs
    (company_id, actor_id, actor_role, action, resource_table, resource_id,
     old_data, new_data, correlation_id, ip, prev_hash, entry_hash)
  values
    (v_company, v_actor, nullif(current_setting('app.user_role', true), ''),
     lower(tg_op), tg_table_name, v_row_id, v_old, v_new, v_corr,
     nullif(current_setting('app.client_ip', true), ''), v_prev, v_hash)
  returning id into v_audit;

  update audit_log_hash_chain
     set last_hash = v_hash,
         last_audit_id = v_audit
   where id = v_chain;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- attach_standard_triggers(p_table): exactly one audit trigger and one
-- updated_at trigger per table, idempotently.
-- ---------------------------------------------------------------------------
create or replace function attach_standard_triggers(p_table regclass)
returns void
language plpgsql
as $$
declare
  tname text := (select relname from pg_class where oid = p_table);
begin
  execute format('drop trigger if exists %I on %s', format('trg_%s_audit', tname), p_table);
  execute format(
    'create trigger %I after insert or update or delete on %s for each row execute function audit_trigger()',
    format('trg_%s_audit', tname), p_table
  );
  execute format('drop trigger if exists %I on %s', format('trg_%s_updated', tname), p_table);
  execute format(
    'create trigger %I before update on %s for each row execute function set_updated_at()',
    format('trg_%s_updated', tname), p_table
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- enforce_soft_delete(): optional per-table guard turning DELETE into a
-- soft delete (deleted_at stamp). Used on tables that opt out of hard
-- removal entirely.
-- ---------------------------------------------------------------------------
create or replace function enforce_soft_delete()
returns trigger
language plpgsql
as $$
begin
  if old.deleted_at is null then
    execute format('update %s set deleted_at = now() where id = $1', tg_table_name)
      using old.id;
  end if;
  return null; -- suppress the hard delete
end;
$$;
