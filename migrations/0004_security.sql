-- path: migrations/0004_security.sql
-- STEP_00 batch 4: security substrate. Internal server tables; the API layer
-- (lib/http, STEP_02 auth flows) writes them under system policies.

create table if not exists ip_reputation (
  id          uuid        primary key default uuid_generate_v7(),
  company_id  uuid        null, -- platform-level intel
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz null,
  version     integer     not null default 0,
  ip          inet        not null,
  kind        text        not null default 'unknown',
  score       integer     not null default 0,
  source      text        null,
  observed_at timestamptz not null default now(),
  constraint chk_ip_reputation_kind
    check (kind in ('residential', 'datacenter', 'vpn', 'proxy', 'tor', 'unknown'))
);

create index if not exists idx_ip_reputation_company_id on ip_reputation (company_id);
create index if not exists idx_ip_reputation_created_at on ip_reputation (created_at);
create unique index if not exists uq_ip_reputation_ip on ip_reputation (ip) where deleted_at is null;

select apply_base_rls('public.ip_reputation');
select attach_standard_triggers('public.ip_reputation');

drop policy if exists system_all_ip_reputation on ip_reputation;
create policy system_all_ip_reputation on ip_reputation for all to public using (true) with check (true);

create table if not exists device_fingerprints (
  id               uuid        primary key default uuid_generate_v7(),
  company_id       uuid        null, -- user-scoped, above tenants
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz null,
  version          integer     not null default 0,
  user_id          uuid        not null references users(id) on delete restrict,
  fingerprint_hash text        not null,
  user_agent       text        null,
  trusted          boolean     not null default false,
  last_seen_at     timestamptz not null default now()
);

create index if not exists idx_device_fingerprints_company_id on device_fingerprints (company_id);
create index if not exists idx_device_fingerprints_created_at on device_fingerprints (created_at);
create index if not exists idx_device_fingerprints_user on device_fingerprints (user_id);

select apply_base_rls('public.device_fingerprints');
select attach_standard_triggers('public.device_fingerprints');

drop policy if exists system_all_device_fingerprints on device_fingerprints;
create policy system_all_device_fingerprints on device_fingerprints for all to public using (true) with check (true);

create table if not exists sessions (
  id                 uuid        primary key default uuid_generate_v7(),
  company_id         uuid        null, -- session belongs to a user identity
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz null,
  version            integer     not null default 0,
  user_id            uuid        not null references users(id) on delete restrict,
  refresh_token_hash text        not null,
  device_id          uuid        null references device_fingerprints(id) on delete restrict,
  ip                 inet        null,
  expires_at         timestamptz not null,
  revoked_at         timestamptz null,
  last_seen_at       timestamptz not null default now()
);

create index if not exists idx_sessions_company_id on sessions (company_id);
create index if not exists idx_sessions_created_at on sessions (created_at);
create index if not exists idx_sessions_user on sessions (user_id);
create unique index if not exists uq_sessions_refresh_hash on sessions (refresh_token_hash)
  where deleted_at is null;

select apply_base_rls('public.sessions');
select attach_standard_triggers('public.sessions');

drop policy if exists system_all_sessions on sessions;
create policy system_all_sessions on sessions for all to public using (true) with check (true);

create table if not exists login_attempts (
  id             uuid        primary key default uuid_generate_v7(),
  company_id     uuid        null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz null,
  version        integer     not null default 0,
  user_id        uuid        null references users(id) on delete restrict,
  email          text        null,
  ip             inet        null,
  success        boolean     not null,
  failure_reason text        null
);

create index if not exists idx_login_attempts_company_id on login_attempts (company_id);
create index if not exists idx_login_attempts_created_at on login_attempts (created_at);
create index if not exists idx_login_attempts_email on login_attempts (lower(email));

select apply_base_rls('public.login_attempts');
select attach_standard_triggers('public.login_attempts');

drop policy if exists system_all_login_attempts on login_attempts;
create policy system_all_login_attempts on login_attempts for all to public using (true) with check (true);

create table if not exists rate_limit_buckets (
  id           uuid        primary key default uuid_generate_v7(),
  company_id   uuid        null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz null,
  version      integer     not null default 0,
  bucket_key   text        not null,
  window_start timestamptz not null,
  hit_count    integer     not null default 0
);

create index if not exists idx_rate_limit_buckets_company_id on rate_limit_buckets (company_id);
create index if not exists idx_rate_limit_buckets_created_at on rate_limit_buckets (created_at);
create unique index if not exists uq_rate_limit_buckets_key_window
  on rate_limit_buckets (bucket_key, window_start) where deleted_at is null;

select apply_base_rls('public.rate_limit_buckets');
select attach_standard_triggers('public.rate_limit_buckets');

drop policy if exists system_all_rate_limit_buckets on rate_limit_buckets;
create policy system_all_rate_limit_buckets on rate_limit_buckets for all to public using (true) with check (true);

create table if not exists idempotency_keys (
  id              uuid        primary key default uuid_generate_v7(),
  company_id      uuid        null, -- scoped per tenant; null = platform scope
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz null,
  version         integer     not null default 0,
  scope           text        not null,
  idem_key        text        not null,
  request_hash    text        not null,
  response_status integer     not null,
  response_body   jsonb       null,
  expires_at      timestamptz not null
);

create index if not exists idx_idempotency_keys_company_id on idempotency_keys (company_id);
create index if not exists idx_idempotency_keys_created_at on idempotency_keys (created_at);
-- company_id may be NULL (platform scope); a sentinel coalesce makes NULL
-- comparable for uniqueness (portable across PG15+ and PGlite).
create unique index if not exists uq_idempotency_keys_scope
  on idempotency_keys (
    coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid),
    scope,
    idem_key
  )
  where deleted_at is null;

select apply_base_rls('public.idempotency_keys');
select attach_standard_triggers('public.idempotency_keys');

drop policy if exists system_all_idempotency_keys on idempotency_keys;
create policy system_all_idempotency_keys on idempotency_keys for all to public using (true) with check (true);

create table if not exists webhook_processed_events (
  id           uuid        primary key default uuid_generate_v7(),
  company_id   uuid        null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz null,
  version      integer     not null default 0,
  provider     text        not null,
  event_id     text        not null,
  payload_hash text        not null,
  processed_at timestamptz not null default now()
);

create index if not exists idx_webhook_processed_events_company_id on webhook_processed_events (company_id);
create index if not exists idx_webhook_processed_events_created_at on webhook_processed_events (created_at);
create unique index if not exists uq_webhook_processed_events_event
  on webhook_processed_events (
    coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid),
    provider,
    event_id
  )
  where deleted_at is null;

select apply_base_rls('public.webhook_processed_events');
select attach_standard_triggers('public.webhook_processed_events');

drop policy if exists system_all_webhook_events on webhook_processed_events;
create policy system_all_webhook_events on webhook_processed_events for all to public using (true) with check (true);
