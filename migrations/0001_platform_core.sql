-- path: migrations/0001_platform_core.sql
-- STEP_00 batch 4: platform core tables.
-- NOTE on enums: user_role_enum and admin_sub_role_enum are created HERE
-- (before memberships, which references them). migrations/0002_enums.sql
-- carries every other shared enum and re-asserts these two value lists with
-- ALTER TYPE ... ADD VALUE IF NOT EXISTS for forward compatibility.

do $do$
begin
  if not exists (select 1 from pg_type where typname = 'user_role_enum') then
    create type user_role_enum as enum
      ('super_admin', 'ceo', 'admin_staff', 'owner', 'staff');
  end if;
  if not exists (select 1 from pg_type where typname = 'admin_sub_role_enum') then
    create type admin_sub_role_enum as enum
      ('kyc_reviewer', 'payment_processor', 'support_agent', 'content_manager',
       'compliance_officer', 'fraud_analyst', 'finance_analyst');
  end if;
end
$do$;

-- --------------------------------------------------------------------------
-- companies (tenants)
-- --------------------------------------------------------------------------
create table if not exists companies (
  id           uuid         primary key default uuid_generate_v7(),
  company_id   uuid         null, -- platform-level table: null by rule
  created_at   timestamptz  not null default now(),
  updated_at   timestamptz  not null default now(),
  deleted_at   timestamptz  null,
  version      integer      not null default 0,
  legal_name   text         not null,
  display_name text         not null,
  slug         text         not null,
  status       text         not null default 'active',
  timezone     text         not null default 'UTC',
  base_currency text        not null default 'USD',
  constraint chk_companies_status check (status in ('active', 'suspended', 'archived')),
  constraint chk_companies_base_currency check (base_currency = 'USD')
);

create index if not exists idx_companies_company_id on companies (company_id);
create index if not exists idx_companies_created_at on companies (created_at);
create unique index if not exists uq_companies_slug on companies (slug) where deleted_at is null;

select apply_base_rls('public.companies');
select attach_standard_triggers('public.companies');

drop policy if exists tenant_isolation_companies on companies;
create policy tenant_isolation_companies on companies for all to public
  using (id = current_company_id() or is_platform_admin())
  with check (id = current_company_id() or is_platform_admin());

-- --------------------------------------------------------------------------
-- users (platform-wide identities; Supabase auth.users links via user id)
-- --------------------------------------------------------------------------
create table if not exists users (
  id                uuid         primary key default uuid_generate_v7(),
  company_id        uuid         null, -- identity lives above tenants
  created_at        timestamptz  not null default now(),
  updated_at        timestamptz  not null default now(),
  deleted_at        timestamptz  null,
  version           integer      not null default 0,
  email             text         not null,
  full_name         text         not null,
  status            text         not null default 'invited',
  email_verified_at timestamptz  null,
  last_login_at     timestamptz  null,
  constraint chk_users_status check (status in ('invited', 'active', 'suspended', 'deactivated'))
);

create index if not exists idx_users_company_id on users (company_id);
create index if not exists idx_users_created_at on users (created_at);
create unique index if not exists uq_users_email_lower on users (lower(email)) where deleted_at is null;

select apply_base_rls('public.users');
select attach_standard_triggers('public.users');

drop policy if exists user_self_read_users on users;
create policy user_self_read_users on users for all to public
  using (id = current_app_user_id() or is_platform_admin())
  with check (id = current_app_user_id() or is_platform_admin());

-- --------------------------------------------------------------------------
-- memberships (user <-> company with role)
-- --------------------------------------------------------------------------
create table if not exists memberships (
  id           uuid         primary key default uuid_generate_v7(),
  company_id   uuid         not null references companies(id) on delete restrict,
  created_at   timestamptz  not null default now(),
  updated_at   timestamptz  not null default now(),
  deleted_at   timestamptz  null,
  version      integer      not null default 0,
  user_id      uuid         not null references users(id) on delete restrict,
  role         user_role_enum not null,
  sub_role     admin_sub_role_enum null,
  constraint chk_memberships_sub_role_only_admin_staff
    check ((role = 'admin_staff' and sub_role is not null)
        or (role <> 'admin_staff' and sub_role is null))
);

create index if not exists idx_memberships_company_id on memberships (company_id);
create index if not exists idx_memberships_created_at on memberships (created_at);
create index if not exists idx_memberships_user_id on memberships (user_id);
create unique index if not exists uq_memberships_user_company on memberships (user_id, company_id)
  where deleted_at is null;

select apply_base_rls('public.memberships');
select attach_standard_triggers('public.memberships');

drop policy if exists tenant_isolation_memberships on memberships;
create policy tenant_isolation_memberships on memberships for all to public
  using (company_id = current_company_id() or is_platform_admin() or user_id = current_app_user_id())
  with check (company_id = current_company_id() or is_platform_admin());

-- --------------------------------------------------------------------------
-- roles catalog (display labels + hierarchy rank; enum itself is the type)
-- --------------------------------------------------------------------------
create table if not exists roles (
  id           uuid         primary key default uuid_generate_v7(),
  company_id   uuid         null, -- platform catalog
  created_at   timestamptz  not null default now(),
  updated_at   timestamptz  not null default now(),
  deleted_at   timestamptz  null,
  version      integer      not null default 0,
  name         user_role_enum not null,
  display_label text        not null,
  rank         integer      not null,
  description  text         not null default ''
);

create index if not exists idx_roles_company_id on roles (company_id);
create index if not exists idx_roles_created_at on roles (created_at);
create unique index if not exists uq_roles_name on roles (name) where deleted_at is null;

select apply_base_rls('public.roles');
select attach_standard_triggers('public.roles');

drop policy if exists catalog_read_roles on roles;
create policy catalog_read_roles on roles for select to public using (true);

insert into roles (name, display_label, rank, description) values
  ('super_admin', 'Super Admin', 5, 'Platform founder. Highest authority, approves everything.'),
  ('ceo', 'CEO', 4, 'Platform operational chief under super_admin.'),
  ('admin_staff', 'Admin Staff', 3, 'Specialized platform worker (7 sub-roles).'),
  ('owner', 'Owner', 2, 'Tenant business owner; full access to own company.'),
  ('staff', 'Staff', 1, 'Tenant employee with granular owner-granted permissions.')
on conflict do nothing;

-- --------------------------------------------------------------------------
-- admin_sub_roles catalog
-- --------------------------------------------------------------------------
create table if not exists admin_sub_roles (
  id           uuid         primary key default uuid_generate_v7(),
  company_id   uuid         null, -- platform catalog
  created_at   timestamptz  not null default now(),
  updated_at   timestamptz  not null default now(),
  deleted_at   timestamptz  null,
  version      integer      not null default 0,
  name         admin_sub_role_enum not null,
  display_label text        not null,
  description  text         not null default ''
);

create index if not exists idx_admin_sub_roles_company_id on admin_sub_roles (company_id);
create index if not exists idx_admin_sub_roles_created_at on admin_sub_roles (created_at);
create unique index if not exists uq_admin_sub_roles_name on admin_sub_roles (name) where deleted_at is null;

select apply_base_rls('public.admin_sub_roles');
select attach_standard_triggers('public.admin_sub_roles');

drop policy if exists catalog_read_admin_sub_roles on admin_sub_roles;
create policy catalog_read_admin_sub_roles on admin_sub_roles for select to public using (true);

insert into admin_sub_roles (name, display_label, description) values
  ('kyc_reviewer', 'KYC Manager', 'KYC review only.'),
  ('payment_processor', 'Payment Processor', 'Payment and payout handling only.'),
  ('support_agent', 'Support Agent', 'Ticket handling only.'),
  ('content_manager', 'Blog Manager', 'CMS and blog only.'),
  ('compliance_officer', 'Compliance Officer', 'Audit and compliance only.'),
  ('fraud_analyst', 'Fraud Analyst', 'Fraud review only.'),
  ('finance_analyst', 'Account Manager', 'Reports and revenue only.')
on conflict do nothing;

-- --------------------------------------------------------------------------
-- permissions catalog
-- --------------------------------------------------------------------------
create table if not exists permissions (
  id           uuid         primary key default uuid_generate_v7(),
  company_id   uuid         null, -- platform catalog
  created_at   timestamptz  not null default now(),
  updated_at   timestamptz  not null default now(),
  deleted_at   timestamptz  null,
  version      integer      not null default 0,
  key          text         not null,
  description  text         not null default ''
);

create index if not exists idx_permissions_company_id on permissions (company_id);
create index if not exists idx_permissions_created_at on permissions (created_at);
create unique index if not exists uq_permissions_key on permissions (key) where deleted_at is null;

select apply_base_rls('public.permissions');
select attach_standard_triggers('public.permissions');

drop policy if exists catalog_read_permissions on permissions;
create policy catalog_read_permissions on permissions for select to public using (true);

insert into permissions (key, description) values
  ('platform.root', 'Full platform access (super_admin implicit).'),
  ('rbac.read', 'Read roles, sub-roles and permission assignments.'),
  ('rbac.manage', 'Change role and permission assignments.')
on conflict do nothing;

-- --------------------------------------------------------------------------
-- role_permissions (catalog role -> permission grant)
-- --------------------------------------------------------------------------
create table if not exists role_permissions (
  id            uuid        primary key default uuid_generate_v7(),
  company_id    uuid        null, -- platform catalog
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz null,
  version       integer     not null default 0,
  role          user_role_enum not null,
  permission_id uuid        not null references permissions(id) on delete restrict
);

create index if not exists idx_role_permissions_company_id on role_permissions (company_id);
create index if not exists idx_role_permissions_created_at on role_permissions (created_at);
create unique index if not exists uq_role_permissions_role_perm on role_permissions (role, permission_id)
  where deleted_at is null;

select apply_base_rls('public.role_permissions');
select attach_standard_triggers('public.role_permissions');

drop policy if exists catalog_read_role_permissions on role_permissions;
create policy catalog_read_role_permissions on role_permissions for select to public using (true);

insert into role_permissions (role, permission_id)
select 'super_admin', p.id from permissions p where p.key in ('platform.root', 'rbac.read', 'rbac.manage')
on conflict do nothing;

insert into role_permissions (role, permission_id)
select 'ceo', p.id from permissions p where p.key in ('rbac.read')
on conflict do nothing;
