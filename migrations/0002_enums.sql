-- path: migrations/0002_enums.sql
DO $$ BEGIN
  CREATE TYPE public.user_role_enum AS ENUM (
    'super_admin', 'ceo', 'admin_staff', 'owner', 'staff', 'client'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.admin_sub_role_enum AS ENUM (
    'kyc_reviewer', 'payment_processor', 'support_agent', 'content_manager',
    'compliance_officer', 'fraud_analyst', 'finance_analyst'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.company_status_enum AS ENUM (
    'pending', 'active', 'suspended', 'closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.user_status_enum AS ENUM (
    'pending', 'active', 'suspended', 'closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.membership_status_enum AS ENUM (
    'invited', 'active', 'suspended', 'revoked'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status_enum AS ENUM (
    'pending', 'authorized', 'captured', 'failed', 'refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.invoice_status_enum AS ENUM (
    'draft', 'sent', 'viewed', 'partially_paid', 'paid', 'overdue', 'cancelled', 'voided'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.kyc_status_enum AS ENUM (
    'not_started', 'pending', 'under_review', 'approved', 'rejected', 'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payout_status_enum AS ENUM (
    'pending', 'queued', 'processing', 'paid', 'failed', 'cancelled', 'returned'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.approval_status_enum AS ENUM (
    'pending', 'approved', 'rejected', 'cancelled', 'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.file_category_enum AS ENUM (
    'invoice', 'receipt', 'contract', 'kyc', 'product', 'profile', 'report', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.subscription_status_enum AS ENUM (
    'trialing', 'active', 'past_due', 'paused', 'cancelled', 'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.idempotency_status_enum AS ENUM (
    'in_progress', 'completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.webhook_status_enum AS ENUM (
    'pending', 'processed', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.plan_interval_enum AS ENUM (
    'monthly', 'yearly'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.coupon_discount_type_enum AS ENUM (
    'percentage', 'fixed_amount'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
