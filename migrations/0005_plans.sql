-- path: migrations/0005_plans.sql
-- STEP_00 batch 4: plans, limits, subscriptions, entitlements, coupons.
-- Money columns are numeric(18,4) not null, always USD (Rule 2).

create table if not exists plans (
  id            uuid        primary key default uuid_generate_v7(),
  company_id    uuid        null, -- platform catalog
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz null,
  version       integer     not null default 0,
  code          text        not null,
  name          text        not null,
  monthly_price numeric(18,4) not null default 0,
  yearly_price  numeric(18,4) not null default 0,
  tier_rank     integer     not null default 0,
  is_active     boolean     not null default true,
  constraint chk_plans_monthly_price_nonneg check (monthly_price >= 0),
  constraint chk_plans_yearly_price_nonneg check (yearly_price >= 0)
);

create index if not exists idx_plans_company_id on plans (company_id);
create index if not exists idx_plans_created_at on plans (created_at);
create unique index if not exists uq_plans_code on plans (code) where deleted_at is null;

select apply_base_rls('public.plans');
select attach_standard_triggers('public.plans');

drop policy if exists catalog_read_plans on plans;
create policy catalog_read_plans on plans for select to public using (true);

drop policy if exists platform_write_plans on plans;
create policy platform_write_plans on plans for insert to public
  with check (is_platform_admin());

drop policy if exists platform_update_plans on plans;
create policy platform_update_plans on plans for update to public
  using (is_platform_admin()) with check (is_platform_admin());

create table if not exists plan_limits (
  id          uuid        primary key default uuid_generate_v7(),
  company_id  uuid        null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz null,
  version     integer     not null default 0,
  plan_id     uuid        not null references plans(id) on delete restrict,
  feature_key text        not null,
  limit_value bigint      null, -- null means unlimited; counts, not money
  constraint chk_plan_limits_value_pos check (limit_value is null or limit_value >= 0)
);

create index if not exists idx_plan_limits_company_id on plan_limits (company_id);
create index if not exists idx_plan_limits_created_at on plan_limits (created_at);
create index if not exists idx_plan_limits_plan on plan_limits (plan_id);
create unique index if not exists uq_plan_limits_plan_feature on plan_limits (plan_id, feature_key)
  where deleted_at is null;

select apply_base_rls('public.plan_limits');
select attach_standard_triggers('public.plan_limits');

drop policy if exists catalog_read_plan_limits on plan_limits;
create policy catalog_read_plan_limits on plan_limits for select to public using (true);

drop policy if exists platform_write_plan_limits on plan_limits;
create policy platform_write_plan_limits on plan_limits for insert to public
  with check (is_platform_admin());

drop policy if exists platform_update_plan_limits on plan_limits;
create policy platform_update_plan_limits on plan_limits for update to public
  using (is_platform_admin()) with check (is_platform_admin());

create table if not exists subscriptions (
  id                   uuid        primary key default uuid_generate_v7(),
  company_id           uuid        not null references companies(id) on delete restrict,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz null,
  version              integer     not null default 0,
  plan_id              uuid        not null references plans(id) on delete restrict,
  status               subscription_status_enum not null default 'active',
  current_period_start timestamptz not null,
  current_period_end   timestamptz not null,
  trial_ends_at        timestamptz null,
  cancel_at            timestamptz null,
  constraint chk_subscriptions_period check (current_period_end > current_period_start)
);

create index if not exists idx_subscriptions_company_id on subscriptions (company_id);
create index if not exists idx_subscriptions_created_at on subscriptions (created_at);
create index if not exists idx_subscriptions_plan on subscriptions (plan_id);
create unique index if not exists uq_subscriptions_one_active
  on subscriptions (company_id)
  where deleted_at is null and status in ('trialing', 'active', 'past_due');

select apply_base_rls('public.subscriptions');
select attach_standard_triggers('public.subscriptions');

drop policy if exists tenant_read_subscriptions on subscriptions;
create policy tenant_read_subscriptions on subscriptions for select to public
  using (company_id = current_company_id() or is_platform_admin());

drop policy if exists platform_write_subscriptions on subscriptions;
create policy platform_write_subscriptions on subscriptions for insert to public
  with check (is_platform_admin());

drop policy if exists platform_update_subscriptions on subscriptions;
create policy platform_update_subscriptions on subscriptions for update to public
  using (is_platform_admin()) with check (is_platform_admin());

create table if not exists entitlements (
  id          uuid        primary key default uuid_generate_v7(),
  company_id  uuid        not null references companies(id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz null,
  version     integer     not null default 0,
  feature_key text        not null,
  source      text        not null default 'plan',
  granted_by  uuid        null references users(id) on delete restrict,
  expires_at  timestamptz null,
  constraint chk_entitlements_source check (source in ('plan', 'manual', 'coupon'))
);

create index if not exists idx_entitlements_company_id on entitlements (company_id);
create index if not exists idx_entitlements_created_at on entitlements (created_at);
create unique index if not exists uq_entitlements_company_feature
  on entitlements (company_id, feature_key) where deleted_at is null;

select apply_base_rls('public.entitlements');
select attach_standard_triggers('public.entitlements');

drop policy if exists tenant_read_entitlements on entitlements;
create policy tenant_read_entitlements on entitlements for select to public
  using (company_id = current_company_id() or is_platform_admin());

drop policy if exists platform_write_entitlements on entitlements;
create policy platform_write_entitlements on entitlements for insert to public
  with check (is_platform_admin());

drop policy if exists platform_update_entitlements on entitlements;
create policy platform_update_entitlements on entitlements for update to public
  using (is_platform_admin()) with check (is_platform_admin());

create table if not exists coupons (
  id              uuid        primary key default uuid_generate_v7(),
  company_id      uuid        null, -- platform catalog
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz null,
  version         integer     not null default 0,
  code            text        not null,
  kind            coupon_kind_enum not null,
  value           numeric(18,4) not null, -- percent (0-100) or fixed USD amount
  max_redemptions integer     null,
  redeemed_count  integer     not null default 0,
  valid_from      timestamptz not null default now(),
  valid_until     timestamptz null,
  is_active       boolean     not null default true,
  constraint chk_coupons_value_pos check (value > 0),
  constraint chk_coupons_percent_range check (kind <> 'percent' or value <= 100),
  constraint chk_coupons_redeemed check (redeemed_count >= 0)
);

create index if not exists idx_coupons_company_id on coupons (company_id);
create index if not exists idx_coupons_created_at on coupons (created_at);
create unique index if not exists uq_coupons_code on coupons (code) where deleted_at is null;

select apply_base_rls('public.coupons');
select attach_standard_triggers('public.coupons');

drop policy if exists platform_read_coupons on coupons;
create policy platform_read_coupons on coupons for select to public
  using (is_platform_admin());

drop policy if exists platform_write_coupons on coupons;
create policy platform_write_coupons on coupons for insert to public
  with check (is_platform_admin());

drop policy if exists platform_update_coupons on coupons;
create policy platform_update_coupons on coupons for update to public
  using (is_platform_admin()) with check (is_platform_admin());
