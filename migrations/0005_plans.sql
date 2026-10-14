-- path: migrations/0005_plans.sql
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  company_id uuid CONSTRAINT fk_plans_companies REFERENCES public.companies(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  plan_key text NOT NULL CHECK (plan_key ~ '^[a-z][a-z0-9_-]{0,63}$'),
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 120),
  description text CHECK (description IS NULL OR length(description) <= 1000),
  price_monthly numeric(18,4) NOT NULL DEFAULT 0 CHECK (price_monthly >= 0),
  price_yearly numeric(18,4) NOT NULL DEFAULT 0 CHECK (price_yearly >= 0),
  currency character(3) NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE TABLE IF NOT EXISTS public.plan_limits (
  id uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  company_id uuid CONSTRAINT fk_plan_limits_companies REFERENCES public.companies(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  plan_id uuid NOT NULL CONSTRAINT fk_plan_limits_plans REFERENCES public.plans(id) ON DELETE RESTRICT,
  limit_key text NOT NULL CHECK (limit_key ~ '^[a-z][a-z0-9_.-]{0,95}$'),
  limit_value bigint CHECK (limit_value IS NULL OR limit_value >= 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  company_id uuid NOT NULL CONSTRAINT fk_subscriptions_companies REFERENCES public.companies(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  plan_id uuid NOT NULL CONSTRAINT fk_subscriptions_plans REFERENCES public.plans(id) ON DELETE RESTRICT,
  status public.subscription_status_enum NOT NULL DEFAULT 'trialing',
  billing_interval public.plan_interval_enum NOT NULL DEFAULT 'monthly',
  started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  trial_ends_at timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  cancelled_at timestamptz,
  CONSTRAINT chk_subscriptions_period CHECK (current_period_end > current_period_start)
);

CREATE TABLE IF NOT EXISTS public.entitlements (
  id uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  company_id uuid NOT NULL CONSTRAINT fk_entitlements_companies REFERENCES public.companies(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  entitlement_key text NOT NULL CHECK (entitlement_key ~ '^[a-z][a-z0-9_.-]{0,95}$'),
  entitlement_value jsonb NOT NULL,
  source_subscription_id uuid CONSTRAINT fk_entitlements_subscriptions REFERENCES public.subscriptions(id) ON DELETE RESTRICT,
  starts_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  company_id uuid CONSTRAINT fk_coupons_companies REFERENCES public.companies(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  coupon_code text NOT NULL CHECK (coupon_code ~ '^[A-Za-z0-9_-]{3,64}$'),
  discount_type public.coupon_discount_type_enum NOT NULL,
  discount_value numeric(18,4) NOT NULL CHECK (discount_value >= 0),
  currency character(3) NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
  valid_from timestamptz NOT NULL,
  valid_until timestamptz,
  max_redemptions integer CHECK (max_redemptions IS NULL OR max_redemptions >= 0),
  redemption_count integer NOT NULL DEFAULT 0 CHECK (redemption_count >= 0),
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT chk_coupons_valid_period CHECK (valid_until IS NULL OR valid_until > valid_from),
  CONSTRAINT chk_coupons_percentage CHECK (
    discount_type <> 'percentage' OR discount_value <= 100
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_company_key_active
  ON public.plans (company_id, plan_key) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_plan_limits_plan_key_active
  ON public.plan_limits (plan_id, limit_key) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_active_company
  ON public.subscriptions (company_id)
  WHERE deleted_at IS NULL AND status IN ('trialing', 'active', 'past_due', 'paused');
CREATE UNIQUE INDEX IF NOT EXISTS idx_entitlements_company_key_active
  ON public.entitlements (company_id, entitlement_key) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_company_code_active
  ON public.coupons (
    COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid),
    upper(coupon_code)
  ) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_plans_company_id ON public.plans (company_id);
CREATE INDEX IF NOT EXISTS idx_plans_created_at ON public.plans (created_at);
CREATE INDEX IF NOT EXISTS idx_plan_limits_company_id ON public.plan_limits (company_id);
CREATE INDEX IF NOT EXISTS idx_plan_limits_created_at ON public.plan_limits (created_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_company_id ON public.subscriptions (company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_created_at ON public.subscriptions (created_at);
CREATE INDEX IF NOT EXISTS idx_entitlements_company_id ON public.entitlements (company_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_created_at ON public.entitlements (created_at);
CREATE INDEX IF NOT EXISTS idx_coupons_company_id ON public.coupons (company_id);
CREATE INDEX IF NOT EXISTS idx_coupons_created_at ON public.coupons (created_at);
CREATE INDEX IF NOT EXISTS idx_plan_limits_plan_id ON public.plan_limits (plan_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_subscription_id ON public.entitlements (source_subscription_id);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_plans_default_deny ON public.plans;
CREATE POLICY policy_plans_default_deny ON public.plans
  FOR ALL USING (public.deny_all()) WITH CHECK (public.deny_all());

ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_limits FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_plan_limits_default_deny ON public.plan_limits;
CREATE POLICY policy_plan_limits_default_deny ON public.plan_limits
  FOR ALL USING (public.deny_all()) WITH CHECK (public.deny_all());

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_subscriptions_default_deny ON public.subscriptions;
CREATE POLICY policy_subscriptions_default_deny ON public.subscriptions
  FOR ALL USING (public.deny_all()) WITH CHECK (public.deny_all());

ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_entitlements_default_deny ON public.entitlements;
CREATE POLICY policy_entitlements_default_deny ON public.entitlements
  FOR ALL USING (public.deny_all()) WITH CHECK (public.deny_all());

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_coupons_default_deny ON public.coupons;
CREATE POLICY policy_coupons_default_deny ON public.coupons
  FOR ALL USING (public.deny_all()) WITH CHECK (public.deny_all());

DROP TRIGGER IF EXISTS trg_plans_set_updated_at ON public.plans;
CREATE TRIGGER trg_plans_set_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_plans_soft_delete ON public.plans;
CREATE TRIGGER trg_plans_soft_delete BEFORE UPDATE OF deleted_at ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_metadata();
DROP TRIGGER IF EXISTS trg_plans_audit ON public.plans;
CREATE TRIGGER trg_plans_audit AFTER INSERT OR UPDATE OR DELETE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS trg_plan_limits_set_updated_at ON public.plan_limits;
CREATE TRIGGER trg_plan_limits_set_updated_at BEFORE UPDATE ON public.plan_limits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_plan_limits_soft_delete ON public.plan_limits;
CREATE TRIGGER trg_plan_limits_soft_delete BEFORE UPDATE OF deleted_at ON public.plan_limits
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_metadata();
DROP TRIGGER IF EXISTS trg_plan_limits_audit ON public.plan_limits;
CREATE TRIGGER trg_plan_limits_audit AFTER INSERT OR UPDATE OR DELETE ON public.plan_limits
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS trg_subscriptions_set_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_set_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_subscriptions_soft_delete ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_soft_delete BEFORE UPDATE OF deleted_at ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_metadata();
DROP TRIGGER IF EXISTS trg_subscriptions_audit ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_audit AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS trg_entitlements_set_updated_at ON public.entitlements;
CREATE TRIGGER trg_entitlements_set_updated_at BEFORE UPDATE ON public.entitlements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_entitlements_soft_delete ON public.entitlements;
CREATE TRIGGER trg_entitlements_soft_delete BEFORE UPDATE OF deleted_at ON public.entitlements
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_metadata();
DROP TRIGGER IF EXISTS trg_entitlements_audit ON public.entitlements;
CREATE TRIGGER trg_entitlements_audit AFTER INSERT OR UPDATE OR DELETE ON public.entitlements
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS trg_coupons_set_updated_at ON public.coupons;
CREATE TRIGGER trg_coupons_set_updated_at BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_coupons_soft_delete ON public.coupons;
CREATE TRIGGER trg_coupons_soft_delete BEFORE UPDATE OF deleted_at ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_metadata();
DROP TRIGGER IF EXISTS trg_coupons_audit ON public.coupons;
CREATE TRIGGER trg_coupons_audit AFTER INSERT OR UPDATE OR DELETE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
