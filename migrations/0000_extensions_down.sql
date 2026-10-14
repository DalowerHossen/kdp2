-- path: migrations/0000_extensions_down.sql
DROP FUNCTION IF EXISTS public.audit_trigger();
DROP FUNCTION IF EXISTS public.current_correlation_id();
DROP FUNCTION IF EXISTS public.current_actor_id();
DROP FUNCTION IF EXISTS public.current_company_id();
DROP FUNCTION IF EXISTS public.try_uuid(text);
DROP FUNCTION IF EXISTS public.deny_all();
DROP FUNCTION IF EXISTS public.set_soft_delete_metadata();
DROP FUNCTION IF EXISTS public.set_updated_at();
DROP FUNCTION IF EXISTS public.uuid_generate_v7();
DROP EXTENSION IF EXISTS pgcrypto;
