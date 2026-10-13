-- path: migrations/0001_platform_core.sql
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  company_id uuid GENERATED ALWAYS AS (id) STORED NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  legal_name text CHECK (legal_name IS NULL OR length(legal_name) <= 255),
  country_code character(2),
  timezone text NOT NULL DEFAULT 'UTC',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'closed'))
);

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  company_id uuid CONSTRAINT fk_users_companies REFERENCES public.companies(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  auth_user_id uuid NOT NULL,
  email text NOT NULL CHECK (length(email) BETWEEN 3 AND 320),
  full_name text CHECK (full_name IS NULL OR length(full_name) <= 255),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended', 'closed')),
  two_factor_enabled boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  company_id uuid CONSTRAINT fk_roles_companies REFERENCES public.companies(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  role_key text NOT NULL CHECK (role_key ~ '^[a-z][a-z0-9_]{0,63}$'),
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 120),
  is_system boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.admin_sub_roles (
  id uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  company_id uuid CONSTRAINT fk_admin_sub_roles_companies REFERENCES public.companies(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  role_key text NOT NULL CHECK (role_key ~ '^[a-z][a-z0-9_]{0,63}$'),
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 120),
  is_system boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  company_id uuid CONSTRAINT fk_permissions_companies REFERENCES public.companies(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  permission_key text NOT NULL CHECK (permission_key ~ '^[a-z][a-z0-9_.:-]{0,127}$'),
  description text CHECK (description IS NULL OR length(description) <= 500)
);

CREATE TABLE IF NOT EXISTS public.memberships (
  id uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  company_id uuid NOT NULL CONSTRAINT fk_memberships_companies REFERENCES public.companies(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  user_id uuid NOT NULL CONSTRAINT fk_memberships_users REFERENCES public.users(id) ON DELETE RESTRICT,
  role_id uuid NOT NULL CONSTRAINT fk_memberships_roles REFERENCES public.roles(id) ON DELETE RESTRICT,
  invited_by uuid CONSTRAINT fk_memberships_invited_by_users REFERENCES public.users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'suspended', 'revoked')),
  joined_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  company_id uuid CONSTRAINT fk_role_permissions_companies REFERENCES public.companies(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  role_id uuid NOT NULL CONSTRAINT fk_role_permissions_roles REFERENCES public.roles(id) ON DELETE RESTRICT,
  permission_id uuid NOT NULL CONSTRAINT fk_role_permissions_permissions REFERENCES public.permissions(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_slug_active
  ON public.companies (slug) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_user_id_active
  ON public.users (auth_user_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_active
  ON public.users (lower(email)) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_company_role_key_active
  ON public.roles (company_id, role_key) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_sub_roles_company_role_key_active
  ON public.admin_sub_roles (company_id, role_key) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_permissions_company_key_active
  ON public.permissions (company_id, permission_key) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_memberships_company_user_active
  ON public.memberships (company_id, user_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_role_permissions_role_permission_active
  ON public.role_permissions (role_id, permission_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_companies_company_id ON public.companies (company_id);
CREATE INDEX IF NOT EXISTS idx_companies_created_at ON public.companies (created_at);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON public.users (company_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users (created_at);
CREATE INDEX IF NOT EXISTS idx_roles_company_id ON public.roles (company_id);
CREATE INDEX IF NOT EXISTS idx_roles_created_at ON public.roles (created_at);
CREATE INDEX IF NOT EXISTS idx_admin_sub_roles_company_id ON public.admin_sub_roles (company_id);
CREATE INDEX IF NOT EXISTS idx_admin_sub_roles_created_at ON public.admin_sub_roles (created_at);
CREATE INDEX IF NOT EXISTS idx_permissions_company_id ON public.permissions (company_id);
CREATE INDEX IF NOT EXISTS idx_permissions_created_at ON public.permissions (created_at);
CREATE INDEX IF NOT EXISTS idx_memberships_company_id ON public.memberships (company_id);
CREATE INDEX IF NOT EXISTS idx_memberships_created_at ON public.memberships (created_at);
CREATE INDEX IF NOT EXISTS idx_role_permissions_company_id ON public.role_permissions (company_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_created_at ON public.role_permissions (created_at);
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public.memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions (role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON public.role_permissions (permission_id);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_companies_default_deny ON public.companies;
CREATE POLICY policy_companies_default_deny ON public.companies
  FOR ALL USING (public.deny_all()) WITH CHECK (public.deny_all());

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_users_default_deny ON public.users;
CREATE POLICY policy_users_default_deny ON public.users
  FOR ALL USING (public.deny_all()) WITH CHECK (public.deny_all());

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_roles_default_deny ON public.roles;
CREATE POLICY policy_roles_default_deny ON public.roles
  FOR ALL USING (public.deny_all()) WITH CHECK (public.deny_all());

ALTER TABLE public.admin_sub_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sub_roles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_admin_sub_roles_default_deny ON public.admin_sub_roles;
CREATE POLICY policy_admin_sub_roles_default_deny ON public.admin_sub_roles
  FOR ALL USING (public.deny_all()) WITH CHECK (public.deny_all());

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_permissions_default_deny ON public.permissions;
CREATE POLICY policy_permissions_default_deny ON public.permissions
  FOR ALL USING (public.deny_all()) WITH CHECK (public.deny_all());

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_memberships_default_deny ON public.memberships;
CREATE POLICY policy_memberships_default_deny ON public.memberships
  FOR ALL USING (public.deny_all()) WITH CHECK (public.deny_all());

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_role_permissions_default_deny ON public.role_permissions;
CREATE POLICY policy_role_permissions_default_deny ON public.role_permissions
  FOR ALL USING (public.deny_all()) WITH CHECK (public.deny_all());
