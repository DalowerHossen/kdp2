-- path: migrations/0003_audit.sql
-- STEP_00 batch 4: append-only audit log with hash chain.

create table if not exists audit_logs (
  id             uuid        primary key default uuid_generate_v7(),
  company_id     uuid        null, -- null for platform-scope events
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz null,
  version        integer     not null default 0,
  actor_id       uuid        null,
  actor_role     text        null,
  action         text        not null,
  resource_table text        not null,
  resource_id    uuid        null,
  old_data       jsonb       null,
  new_data       jsonb       null,
  correlation_id text        null,
  ip             text        null,
  prev_hash      text        not null,
  entry_hash     text        not null,
  constraint chk_audit_logs_action check (action in ('insert', 'update', 'delete', 'login', 'unlock', 'custom'))
);

create index if not exists idx_audit_logs_company_id on audit_logs (company_id);
create index if not exists idx_audit_logs_created_at on audit_logs (created_at);
create index if not exists idx_audit_logs_resource on audit_logs (resource_table, resource_id);
create index if not exists idx_audit_logs_actor on audit_logs (actor_id);
create index if not exists idx_audit_logs_corr on audit_logs (correlation_id);

select apply_base_rls('public.audit_logs');

-- No audit trigger on audit_logs itself (would recurse); updated_at trigger
-- is also pointless because rows are immutable. DML below makes that true.
revoke update, delete on audit_logs from public;

drop rule if exists audit_logs_no_update on audit_logs;
create rule audit_logs_no_update as on update to audit_logs do instead nothing;

drop rule if exists audit_logs_no_delete on audit_logs;
create rule audit_logs_no_delete as on delete to audit_logs do instead nothing;

-- Read access: platform admins only (tenants never read the audit store
-- directly; tenant-facing audit views are curated services).
drop policy if exists platform_read_audit_logs on audit_logs;
create policy platform_read_audit_logs on audit_logs for select to public
  using (is_platform_admin());

-- System write path: the shared audit_trigger (running under whatever role
-- issued the DML, including the table owner under FORCE RLS) must be able to
-- append rows. Reads stay platform-only and rows stay immutable (rules above),
-- so injected rows cannot rewrite history unnoticed.
drop policy if exists system_insert_audit_logs on audit_logs;
create policy system_insert_audit_logs on audit_logs for insert to public with check (true);

-- ---------------------------------------------------------------------------
-- Hash chain head (singleton row).
-- ---------------------------------------------------------------------------
create table if not exists audit_log_hash_chain (
  id            uuid        primary key default uuid_generate_v7(),
  company_id    uuid        null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz null,
  version       integer     not null default 0,
  last_hash     text        not null default '',
  last_audit_id uuid        null
);

create index if not exists idx_audit_log_hash_chain_company_id on audit_log_hash_chain (company_id);
create index if not exists idx_audit_log_hash_chain_created_at on audit_log_hash_chain (created_at);

select apply_base_rls('public.audit_log_hash_chain');

revoke insert, update, delete on audit_log_hash_chain from public;

drop policy if exists platform_read_audit_chain on audit_log_hash_chain;
create policy platform_read_audit_chain on audit_log_hash_chain for select to public
  using (is_platform_admin());

-- Chain head writes come only from audit_trigger (insert on first use, then
-- update per audited row).
drop policy if exists system_insert_audit_chain on audit_log_hash_chain;
create policy system_insert_audit_chain on audit_log_hash_chain for insert to public with check (true);

drop policy if exists system_update_audit_chain on audit_log_hash_chain;
create policy system_update_audit_chain on audit_log_hash_chain for update to public
  using (true) with check (true);

insert into audit_log_hash_chain (id, last_hash)
values ('00000000-0000-7000-8000-000000000001', '')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Mutation ledger for the migration runner (fits the base shape so the
-- invariant checker covers it too).
-- ---------------------------------------------------------------------------
create table if not exists _migration_ledger (
  id          uuid        primary key default uuid_generate_v7(),
  company_id  uuid        null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz null,
  version     integer     not null default 0,
  name        text        not null,
  checksum    text        not null,
  applied_at  timestamptz not null default now()
);

create index if not exists idx__migration_ledger_company_id on _migration_ledger (company_id);
create index if not exists idx__migration_ledger_created_at on _migration_ledger (created_at);
create unique index if not exists uq__migration_ledger_name on _migration_ledger (name);

select apply_base_rls('public._migration_ledger');

-- The migration runner reads and appends ledger rows; infra table, no tenant
-- surface.
drop policy if exists system_select_migration_ledger on _migration_ledger;
create policy system_select_migration_ledger on _migration_ledger for select to public using (true);

drop policy if exists system_insert_migration_ledger on _migration_ledger;
create policy system_insert_migration_ledger on _migration_ledger for insert to public with check (true);
