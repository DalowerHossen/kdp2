-- path: migrations/0002_enums_down.sql
DROP TYPE IF EXISTS public.coupon_discount_type_enum;
DROP TYPE IF EXISTS public.plan_interval_enum;
DROP TYPE IF EXISTS public.webhook_status_enum;
DROP TYPE IF EXISTS public.idempotency_status_enum;
DROP TYPE IF EXISTS public.subscription_status_enum;
DROP TYPE IF EXISTS public.file_category_enum;
DROP TYPE IF EXISTS public.approval_status_enum;
DROP TYPE IF EXISTS public.payout_status_enum;
DROP TYPE IF EXISTS public.kyc_status_enum;
DROP TYPE IF EXISTS public.invoice_status_enum;
DROP TYPE IF EXISTS public.payment_status_enum;
DROP TYPE IF EXISTS public.membership_status_enum;
DROP TYPE IF EXISTS public.user_status_enum;
DROP TYPE IF EXISTS public.company_status_enum;
DROP TYPE IF EXISTS public.admin_sub_role_enum;
DROP TYPE IF EXISTS public.user_role_enum;
