-- path: migrations/0004_security_down.sql
DROP FUNCTION IF EXISTS public.release_idempotency(text, text);
DROP FUNCTION IF EXISTS public.complete_idempotency(text, text, integer, jsonb, text);
DROP FUNCTION IF EXISTS public.claim_idempotency(text, text, timestamptz);
DROP FUNCTION IF EXISTS public.consume_rate_limit(text, integer, integer);
DROP TABLE IF EXISTS public.webhook_processed_events;
DROP TABLE IF EXISTS public.idempotency_keys;
DROP TABLE IF EXISTS public.rate_limit_buckets;
DROP TABLE IF EXISTS public.login_attempts;
DROP TABLE IF EXISTS public.sessions;
DROP TABLE IF EXISTS public.device_fingerprints;
DROP TABLE IF EXISTS public.ip_reputation;
