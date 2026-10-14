-- path: migrations/0004_security.sql
CREATE TABLE IF NOT EXISTS public.ip_reputation (
  id uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  company_id uuid CONSTRAINT fk_ip_reputation_companies REFERENCES public.companies(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  ip_hash text NOT NULL CHECK (ip_hash ~ '^[0-9a-f]{64}$'),
  risk_score smallint NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  verdict text NOT NULL CHECK (verdict IN ('allow', 'monitor', 'block')),
  source text NOT NULL CHECK (length(source) BETWEEN 1 AND 64),
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS public.device_fingerprints (
  id uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  company_id uuid NOT NULL CONSTRAINT fk_device_fingerprints_companies REFERENCES public.companies(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  user_id uuid NOT NULL CONSTRAINT fk_device_fingerprints_users REFERENCES public.users(id) ON DELETE RESTRICT,
  fingerprint_hash text NOT NULL CHECK (fingerprint_hash ~ '^[0-9a-f]{64}$'),
  risk_score smallint NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  first_seen_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  last_seen_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  company_id uuid CONSTRAINT fk_sessions_companies REFERENCES public.companies(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  user_id uuid NOT NULL CONSTRAINT fk_sessions_users REFERENCES public.users(id) ON DELETE RESTRICT,
  session_hash text NOT NULL CHECK (session_hash ~ '^[0-9a-f]{64}$'),
  refresh_token_hash text CHECK (refresh_token_hash IS NULL OR refresh_token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  revoked_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  company_id uuid CONSTRAINT fk_login_attempts_companies REFERENCES public.companies(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  user_id uuid CONSTRAINT fk_login_attempts_users REFERENCES public.users(id) ON DELETE RESTRICT,
  email_hash text NOT NULL CHECK (email_hash ~ '^[0-9a-f]{64}$'),
  ip_hash text NOT NULL CHECK (ip_hash ~ '^[0-9a-f]{64}$'),
  succeeded boolean NOT NULL DEFAULT false,
  attempted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  failure_code text CHECK (failure_code IS NULL OR length(failure_code) <= 64)
);

CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  id uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  company_id uuid CONSTRAINT fk_rate_limit_buckets_companies REFERENCES public.companies(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  key_hash text NOT NULL CHECK (key_hash ~ '^[0-9a-f]{64}$'),
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  reset_at timestamptz NOT NULL,
  CONSTRAINT uq_rate_limit_buckets_key_window UNIQUE (key_hash, window_start)
);

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  id uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  company_id uuid CONSTRAINT fk_idempotency_keys_companies REFERENCES public.companies(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  key_hash text NOT NULL CHECK (key_hash ~ '^[0-9a-f]{64}$'),
  request_hash text NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  status public.idempotency_status_enum NOT NULL DEFAULT 'in_progress',
  response_status integer CHECK (response_status IS NULL OR response_status BETWEEN 200 AND 299),
  response_headers jsonb CHECK (response_headers IS NULL OR jsonb_typeof(response_headers) = 'object'),
  response_body text CHECK (response_body IS NULL OR octet_length(response_body) <= 1048576),
  expires_at timestamptz NOT NULL,
  completed_at timestamptz,
  CONSTRAINT uq_idempotency_keys_key_hash UNIQUE (key_hash),
  CONSTRAINT chk_idempotency_keys_completion CHECK (
    (status = 'in_progress' AND response_status IS NULL AND response_headers IS NULL AND response_body IS NULL AND completed_at IS NULL)
    OR
    (status = 'completed' AND response_status IS NOT NULL AND response_headers IS NOT NULL AND response_body IS NOT NULL AND completed_at IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.webhook_processed_events (
  id uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  company_id uuid CONSTRAINT fk_webhook_processed_events_companies REFERENCES public.companies(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  provider_key text NOT NULL CHECK (provider_key ~ '^[a-z][a-z0-9_-]{0,63}$'),
  event_hash text NOT NULL CHECK (event_hash ~ '^[0-9a-f]{64}$'),
  status public.webhook_status_enum NOT NULL DEFAULT 'pending',
  received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  processed_at timestamptz,
  failure_code text CHECK (failure_code IS NULL OR length(failure_code) <= 64),
  CONSTRAINT uq_webhook_processed_events_provider_hash UNIQUE (provider_key, event_hash)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ip_reputation_ip_hash_active
  ON public.ip_reputation (ip_hash) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_device_fingerprints_tenant_user_hash_active
  ON public.device_fingerprints (company_id, user_id, fingerprint_hash) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_session_hash_active
  ON public.sessions (session_hash) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_attempted_at
  ON public.login_attempts (email_hash, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_attempted_at
  ON public.login_attempts (ip_hash, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_reset_at
  ON public.rate_limit_buckets (reset_at);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at
  ON public.idempotency_keys (expires_at);
CREATE INDEX IF NOT EXISTS idx_webhook_processed_events_received_at
  ON public.webhook_processed_events (received_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_processed_events_provider_hash_active
  ON public.webhook_processed_events (provider_key, event_hash) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ip_reputation_company_id ON public.ip_reputation (company_id);
CREATE INDEX IF NOT EXISTS idx_ip_reputation_created_at ON public.ip_reputation (created_at);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_company_id ON public.device_fingerprints (company_id);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_created_at ON public.device_fingerprints (created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_company_id ON public.sessions (company_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON public.sessions (created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_company_id ON public.login_attempts (company_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON public.login_attempts (created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_company_id ON public.rate_limit_buckets (company_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_created_at ON public.rate_limit_buckets (created_at);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_company_id ON public.idempotency_keys (company_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created_at ON public.idempotency_keys (created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_processed_events_company_id ON public.webhook_processed_events (company_id);
CREATE INDEX IF NOT EXISTS idx_webhook_processed_events_created_at ON public.webhook_processed_events (created_at);

ALTER TABLE public.ip_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_reputation FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_ip_reputation_default_deny ON public.ip_reputation;
CREATE POLICY policy_ip_reputation_default_deny ON public.ip_reputation
  FOR ALL USING (public.deny_all()) WITH CHECK (public.deny_all());

ALTER TABLE public.device_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_fingerprints FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_device_fingerprints_default_deny ON public.device_fingerprints;
CREATE POLICY policy_device_fingerprints_default_deny ON public.device_fingerprints
  FOR ALL USING (public.deny_all()) WITH CHECK (public.deny_all());

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_sessions_default_deny ON public.sessions;
CREATE POLICY policy_sessions_default_deny ON public.sessions
  FOR ALL USING (public.deny_all()) WITH CHECK (public.deny_all());

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_login_attempts_default_deny ON public.login_attempts;
CREATE POLICY policy_login_attempts_default_deny ON public.login_attempts
  FOR ALL USING (public.deny_all()) WITH CHECK (public.deny_all());

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_buckets FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_rate_limit_buckets_default_deny ON public.rate_limit_buckets;
CREATE POLICY policy_rate_limit_buckets_default_deny ON public.rate_limit_buckets
  FOR ALL USING (public.deny_all()) WITH CHECK (public.deny_all());

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_idempotency_keys_default_deny ON public.idempotency_keys;
CREATE POLICY policy_idempotency_keys_default_deny ON public.idempotency_keys
  FOR ALL USING (public.deny_all()) WITH CHECK (public.deny_all());

ALTER TABLE public.webhook_processed_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_processed_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_webhook_processed_events_default_deny ON public.webhook_processed_events;
CREATE POLICY policy_webhook_processed_events_default_deny ON public.webhook_processed_events
  FOR ALL USING (public.deny_all()) WITH CHECK (public.deny_all());

DROP TRIGGER IF EXISTS trg_ip_reputation_set_updated_at ON public.ip_reputation;
CREATE TRIGGER trg_ip_reputation_set_updated_at BEFORE UPDATE ON public.ip_reputation
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_ip_reputation_soft_delete ON public.ip_reputation;
CREATE TRIGGER trg_ip_reputation_soft_delete BEFORE UPDATE OF deleted_at ON public.ip_reputation
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_metadata();
DROP TRIGGER IF EXISTS trg_ip_reputation_audit ON public.ip_reputation;
CREATE TRIGGER trg_ip_reputation_audit AFTER INSERT OR UPDATE OR DELETE ON public.ip_reputation
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS trg_device_fingerprints_set_updated_at ON public.device_fingerprints;
CREATE TRIGGER trg_device_fingerprints_set_updated_at BEFORE UPDATE ON public.device_fingerprints
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_device_fingerprints_soft_delete ON public.device_fingerprints;
CREATE TRIGGER trg_device_fingerprints_soft_delete BEFORE UPDATE OF deleted_at ON public.device_fingerprints
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_metadata();
DROP TRIGGER IF EXISTS trg_device_fingerprints_audit ON public.device_fingerprints;
CREATE TRIGGER trg_device_fingerprints_audit AFTER INSERT OR UPDATE OR DELETE ON public.device_fingerprints
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS trg_sessions_set_updated_at ON public.sessions;
CREATE TRIGGER trg_sessions_set_updated_at BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_sessions_soft_delete ON public.sessions;
CREATE TRIGGER trg_sessions_soft_delete BEFORE UPDATE OF deleted_at ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_metadata();
DROP TRIGGER IF EXISTS trg_sessions_audit ON public.sessions;
CREATE TRIGGER trg_sessions_audit AFTER INSERT OR UPDATE OR DELETE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS trg_login_attempts_set_updated_at ON public.login_attempts;
CREATE TRIGGER trg_login_attempts_set_updated_at BEFORE UPDATE ON public.login_attempts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_login_attempts_soft_delete ON public.login_attempts;
CREATE TRIGGER trg_login_attempts_soft_delete BEFORE UPDATE OF deleted_at ON public.login_attempts
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_metadata();
DROP TRIGGER IF EXISTS trg_login_attempts_audit ON public.login_attempts;
CREATE TRIGGER trg_login_attempts_audit AFTER INSERT OR UPDATE OR DELETE ON public.login_attempts
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS trg_rate_limit_buckets_set_updated_at ON public.rate_limit_buckets;
CREATE TRIGGER trg_rate_limit_buckets_set_updated_at BEFORE UPDATE ON public.rate_limit_buckets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_rate_limit_buckets_soft_delete ON public.rate_limit_buckets;
CREATE TRIGGER trg_rate_limit_buckets_soft_delete BEFORE UPDATE OF deleted_at ON public.rate_limit_buckets
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_metadata();
DROP TRIGGER IF EXISTS trg_rate_limit_buckets_audit ON public.rate_limit_buckets;
CREATE TRIGGER trg_rate_limit_buckets_audit AFTER INSERT OR UPDATE OR DELETE ON public.rate_limit_buckets
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS trg_idempotency_keys_set_updated_at ON public.idempotency_keys;
CREATE TRIGGER trg_idempotency_keys_set_updated_at BEFORE UPDATE ON public.idempotency_keys
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_idempotency_keys_soft_delete ON public.idempotency_keys;
CREATE TRIGGER trg_idempotency_keys_soft_delete BEFORE UPDATE OF deleted_at ON public.idempotency_keys
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_metadata();
DROP TRIGGER IF EXISTS trg_idempotency_keys_audit ON public.idempotency_keys;
CREATE TRIGGER trg_idempotency_keys_audit AFTER INSERT OR UPDATE OR DELETE ON public.idempotency_keys
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS trg_webhook_processed_events_set_updated_at ON public.webhook_processed_events;
CREATE TRIGGER trg_webhook_processed_events_set_updated_at BEFORE UPDATE ON public.webhook_processed_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_webhook_processed_events_soft_delete ON public.webhook_processed_events;
CREATE TRIGGER trg_webhook_processed_events_soft_delete BEFORE UPDATE OF deleted_at ON public.webhook_processed_events
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_metadata();
DROP TRIGGER IF EXISTS trg_webhook_processed_events_audit ON public.webhook_processed_events;
CREATE TRIGGER trg_webhook_processed_events_audit AFTER INSERT OR UPDATE OR DELETE ON public.webhook_processed_events
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_key_hash text,
  p_window_seconds integer,
  p_max integer
)
RETURNS TABLE (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer,
  reset_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_window_start timestamptz;
  v_reset_at timestamptz;
  v_request_count integer;
  v_retry_after integer;
BEGIN
  IF p_key_hash IS NULL OR p_key_hash !~ '^[0-9a-f]{64}$'
    OR p_window_seconds IS NULL OR p_window_seconds NOT BETWEEN 1 AND 86400
    OR p_max IS NULL OR p_max NOT BETWEEN 1 AND 1000000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Rate-limit input is invalid';
  END IF;

  v_window_start := to_timestamp(
    floor(extract(epoch FROM clock_timestamp()) / p_window_seconds) * p_window_seconds
  );
  v_reset_at := v_window_start + p_window_seconds * interval '1 second';

  INSERT INTO public.rate_limit_buckets AS current_bucket (
    id, key_hash, window_start, request_count, reset_at
  ) VALUES (
    public.uuid_generate_v7(), p_key_hash, v_window_start, 1, v_reset_at
  )
  ON CONFLICT (key_hash, window_start) DO UPDATE SET
    request_count = LEAST(current_bucket.request_count + 1, p_max + 1),
    reset_at = EXCLUDED.reset_at,
    version = current_bucket.version + 1,
    updated_at = clock_timestamp()
  RETURNING request_count INTO v_request_count;

  v_retry_after := CASE
    WHEN v_request_count > p_max
      THEN GREATEST(1, ceil(extract(epoch FROM (v_reset_at - clock_timestamp())))::integer)
    ELSE 0
  END;

  RETURN QUERY SELECT
    v_request_count <= p_max,
    GREATEST(p_max - v_request_count, 0),
    v_retry_after,
    v_reset_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_idempotency(
  p_key_hash text,
  p_request_hash text,
  p_expires_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_claimed_id uuid;
  v_existing public.idempotency_keys%ROWTYPE;
BEGIN
  IF p_key_hash IS NULL OR p_key_hash !~ '^[0-9a-f]{64}$'
    OR p_request_hash IS NULL OR p_request_hash !~ '^[0-9a-f]{64}$'
    OR p_expires_at IS NULL
    OR p_expires_at <= clock_timestamp()
    OR p_expires_at > clock_timestamp() + interval '7 days' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Idempotency claim input is invalid';
  END IF;

  INSERT INTO public.idempotency_keys AS current_claim (
    id, key_hash, request_hash, status, expires_at
  ) VALUES (
    public.uuid_generate_v7(), p_key_hash, p_request_hash, 'in_progress', p_expires_at
  )
  ON CONFLICT (key_hash) DO UPDATE SET
    request_hash = EXCLUDED.request_hash,
    status = 'in_progress',
    response_status = NULL,
    response_headers = NULL,
    response_body = NULL,
    expires_at = EXCLUDED.expires_at,
    completed_at = NULL,
    deleted_at = NULL,
    version = current_claim.version + 1,
    updated_at = clock_timestamp()
  WHERE current_claim.expires_at <= clock_timestamp() OR current_claim.deleted_at IS NOT NULL
  RETURNING id INTO v_claimed_id;

  IF v_claimed_id IS NOT NULL THEN
    RETURN jsonb_build_object('kind', 'acquired');
  END IF;

  SELECT * INTO v_existing
  FROM public.idempotency_keys
  WHERE key_hash = p_key_hash AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Idempotency claim could not be read';
  END IF;

  IF v_existing.status = 'completed' THEN
    RETURN jsonb_build_object(
      'kind', 'replay',
      'requestHash', v_existing.request_hash,
      'response', jsonb_build_object(
        'status', v_existing.response_status,
        'headers', v_existing.response_headers,
        'body', v_existing.response_body
      )
    );
  END IF;

  RETURN jsonb_build_object('kind', 'in_progress');
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_idempotency(
  p_key_hash text,
  p_request_hash text,
  p_response_status integer,
  p_response_headers jsonb,
  p_response_body text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF p_key_hash IS NULL OR p_key_hash !~ '^[0-9a-f]{64}$'
    OR p_request_hash IS NULL OR p_request_hash !~ '^[0-9a-f]{64}$'
    OR p_response_status IS NULL OR p_response_status NOT BETWEEN 200 AND 299
    OR p_response_headers IS NULL OR jsonb_typeof(p_response_headers) <> 'object'
    OR octet_length(COALESCE(p_response_body, '')) > 1048576
    OR EXISTS (
      SELECT 1
      FROM jsonb_each(p_response_headers) AS headers(name, value)
      WHERE lower(headers.name) NOT IN ('cache-control', 'content-type', 'etag', 'location')
        OR jsonb_typeof(headers.value) <> 'string'
    ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Idempotency response is invalid';
  END IF;

  UPDATE public.idempotency_keys
  SET status = 'completed',
      response_status = p_response_status,
      response_headers = p_response_headers,
      response_body = COALESCE(p_response_body, ''),
      completed_at = clock_timestamp(),
      updated_at = clock_timestamp()
  WHERE key_hash = p_key_hash
    AND request_hash = p_request_hash
    AND status = 'in_progress'
    AND expires_at > clock_timestamp()
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Idempotency claim is no longer active';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_idempotency(
  p_key_hash text,
  p_request_hash text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF p_key_hash IS NULL OR p_key_hash !~ '^[0-9a-f]{64}$'
    OR p_request_hash IS NULL OR p_request_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Idempotency release input is invalid';
  END IF;
  DELETE FROM public.idempotency_keys
  WHERE key_hash = p_key_hash
    AND request_hash = p_request_hash
    AND status = 'in_progress';
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_idempotency(text, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_idempotency(text, text, integer, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_idempotency(text, text) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, integer, integer) TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.claim_idempotency(text, text, timestamptz) TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.complete_idempotency(text, text, integer, jsonb, text) TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.release_idempotency(text, text) TO service_role';
  END IF;
END;
$$;
