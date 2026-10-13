-- path: migrations/0003_audit.sql
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  company_id uuid CONSTRAINT fk_audit_logs_companies REFERENCES public.companies(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  actor_id uuid,
  correlation_id uuid,
  action text NOT NULL CHECK (length(action) BETWEEN 1 AND 128),
  resource text NOT NULL CHECK (length(resource) BETWEEN 1 AND 128),
  resource_id uuid,
  before_hash text CHECK (before_hash IS NULL OR before_hash ~ '^[0-9a-f]{64}$'),
  after_hash text CHECK (after_hash IS NULL OR after_hash ~ '^[0-9a-f]{64}$')
);

CREATE TABLE IF NOT EXISTS public.audit_log_hash_chain (
  id uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  company_id uuid CONSTRAINT fk_audit_log_hash_chain_companies REFERENCES public.companies(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  audit_log_id uuid NOT NULL,
  sequence bigint GENERATED ALWAYS AS IDENTITY,
  previous_hash text CHECK (previous_hash IS NULL OR previous_hash ~ '^[0-9a-f]{64}$'),
  chain_hash text NOT NULL CHECK (chain_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT fk_audit_log_hash_chain_audit_logs
    FOREIGN KEY (audit_log_id) REFERENCES public.audit_logs(id) ON DELETE RESTRICT,
  CONSTRAINT uq_audit_log_hash_chain_sequence UNIQUE (sequence),
  CONSTRAINT uq_audit_log_hash_chain_audit_log UNIQUE (audit_log_id)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON public.audit_logs (company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created_at
  ON public.audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_created_at
  ON public.audit_logs (resource, resource_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_hash_chain_company_id
  ON public.audit_log_hash_chain (company_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_hash_chain_created_at
  ON public.audit_log_hash_chain (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_hash_chain_audit_log_id
  ON public.audit_log_hash_chain (audit_log_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_hash_chain_sequence
  ON public.audit_log_hash_chain (sequence DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_audit_logs_default_deny ON public.audit_logs;
CREATE POLICY policy_audit_logs_default_deny ON public.audit_logs
  FOR ALL USING (public.deny_all()) WITH CHECK (public.deny_all());

ALTER TABLE public.audit_log_hash_chain ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log_hash_chain FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_audit_log_hash_chain_default_deny ON public.audit_log_hash_chain;
CREATE POLICY policy_audit_log_hash_chain_default_deny ON public.audit_log_hash_chain
  FOR ALL USING (public.deny_all()) WITH CHECK (public.deny_all());

CREATE OR REPLACE FUNCTION public.append_audit_hash_chain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
SET TimeZone = 'UTC'
AS $$
DECLARE
  v_previous_hash text;
  v_chain_hash text;
  v_payload text;
BEGIN
  PERFORM pg_advisory_xact_lock(916128, 1);
  SELECT chain_hash INTO v_previous_hash
  FROM public.audit_log_hash_chain
  ORDER BY sequence DESC
  LIMIT 1;

  v_payload := jsonb_build_object(
    'previous_hash', v_previous_hash,
    'id', NEW.id,
    'company_id', NEW.company_id,
    'actor_id', NEW.actor_id,
    'correlation_id', NEW.correlation_id,
    'action', NEW.action,
    'resource', NEW.resource,
    'resource_id', NEW.resource_id,
    'before_hash', NEW.before_hash,
    'after_hash', NEW.after_hash,
    'created_at', NEW.created_at
  )::text;
  v_chain_hash := encode(digest(convert_to(v_payload, 'UTF8'), 'sha256'), 'hex');

  INSERT INTO public.audit_log_hash_chain (
    id, company_id, audit_log_id, previous_hash, chain_hash
  ) VALUES (
    public.uuid_generate_v7(), NEW.company_id, NEW.id, v_previous_hash, v_chain_hash
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '55000',
    MESSAGE = 'Audit records are append-only';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_logs_hash_chain ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_hash_chain
  AFTER INSERT ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.append_audit_hash_chain();
DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_mutation();
DROP TRIGGER IF EXISTS trg_audit_log_hash_chain_immutable ON public.audit_log_hash_chain;
CREATE TRIGGER trg_audit_log_hash_chain_immutable
  BEFORE UPDATE OR DELETE ON public.audit_log_hash_chain
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_mutation();

REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_logs FROM PUBLIC;
REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_log_hash_chain FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_trigger() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.append_audit_hash_chain() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_audit_mutation() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_companies_set_updated_at ON public.companies;
CREATE TRIGGER trg_companies_set_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_companies_soft_delete ON public.companies;
CREATE TRIGGER trg_companies_soft_delete
  BEFORE UPDATE OF deleted_at ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_metadata();
DROP TRIGGER IF EXISTS trg_companies_audit ON public.companies;
CREATE TRIGGER trg_companies_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS trg_users_set_updated_at ON public.users;
CREATE TRIGGER trg_users_set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_users_soft_delete ON public.users;
CREATE TRIGGER trg_users_soft_delete
  BEFORE UPDATE OF deleted_at ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_metadata();
DROP TRIGGER IF EXISTS trg_users_audit ON public.users;
CREATE TRIGGER trg_users_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS trg_roles_set_updated_at ON public.roles;
CREATE TRIGGER trg_roles_set_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_roles_soft_delete ON public.roles;
CREATE TRIGGER trg_roles_soft_delete
  BEFORE UPDATE OF deleted_at ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_metadata();
DROP TRIGGER IF EXISTS trg_roles_audit ON public.roles;
CREATE TRIGGER trg_roles_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS trg_admin_sub_roles_set_updated_at ON public.admin_sub_roles;
CREATE TRIGGER trg_admin_sub_roles_set_updated_at
  BEFORE UPDATE ON public.admin_sub_roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_admin_sub_roles_soft_delete ON public.admin_sub_roles;
CREATE TRIGGER trg_admin_sub_roles_soft_delete
  BEFORE UPDATE OF deleted_at ON public.admin_sub_roles
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_metadata();
DROP TRIGGER IF EXISTS trg_admin_sub_roles_audit ON public.admin_sub_roles;
CREATE TRIGGER trg_admin_sub_roles_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.admin_sub_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS trg_permissions_set_updated_at ON public.permissions;
CREATE TRIGGER trg_permissions_set_updated_at
  BEFORE UPDATE ON public.permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_permissions_soft_delete ON public.permissions;
CREATE TRIGGER trg_permissions_soft_delete
  BEFORE UPDATE OF deleted_at ON public.permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_metadata();
DROP TRIGGER IF EXISTS trg_permissions_audit ON public.permissions;
CREATE TRIGGER trg_permissions_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.permissions
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS trg_memberships_set_updated_at ON public.memberships;
CREATE TRIGGER trg_memberships_set_updated_at
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_memberships_soft_delete ON public.memberships;
CREATE TRIGGER trg_memberships_soft_delete
  BEFORE UPDATE OF deleted_at ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_metadata();
DROP TRIGGER IF EXISTS trg_memberships_audit ON public.memberships;
CREATE TRIGGER trg_memberships_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS trg_role_permissions_set_updated_at ON public.role_permissions;
CREATE TRIGGER trg_role_permissions_set_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_role_permissions_soft_delete ON public.role_permissions;
CREATE TRIGGER trg_role_permissions_soft_delete
  BEFORE UPDATE OF deleted_at ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_metadata();
DROP TRIGGER IF EXISTS trg_role_permissions_audit ON public.role_permissions;
CREATE TRIGGER trg_role_permissions_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
