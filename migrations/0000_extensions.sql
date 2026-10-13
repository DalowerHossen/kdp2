-- path: migrations/0000_extensions.sql
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.uuid_generate_v7()
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
AS $$
DECLARE
  v_unix_ms bigint := floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint;
  v_timestamp_hex text := lpad(to_hex(v_unix_ms), 12, '0');
  v_random_hex text := replace(gen_random_uuid()::text, '-', '');
BEGIN
  RETURN (
    substr(v_timestamp_hex, 1, 8) || '-' ||
    substr(v_timestamp_hex, 9, 4) || '-7' ||
    substr(v_random_hex, 1, 3) || '-8' ||
    substr(v_random_hex, 4, 3) || '-' ||
    substr(v_random_hex, 7, 12)
  )::uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_soft_delete_metadata()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
    NEW.version := GREATEST(NEW.version, OLD.version + 1);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.deny_all()
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT false;
$$;

CREATE OR REPLACE FUNCTION public.try_uuid(p_value text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
BEGIN
  IF p_value IS NULL OR p_value = '' THEN
    RETURN NULL;
  END IF;
  RETURN p_value::uuid;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT public.try_uuid(NULLIF(current_setting('app.company_id', true), ''));
$$;

CREATE OR REPLACE FUNCTION public.current_actor_id()
RETURNS uuid
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT public.try_uuid(NULLIF(current_setting('app.user_id', true), ''));
$$;

CREATE OR REPLACE FUNCTION public.current_correlation_id()
RETURNS uuid
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT public.try_uuid(NULLIF(current_setting('app.correlation_id', true), ''));
$$;

CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
SET TimeZone = 'UTC'
AS $$
DECLARE
  v_row jsonb;
  v_company_id uuid;
  v_resource_id uuid;
  v_before_hash text;
  v_after_hash text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_row := to_jsonb(OLD);
    v_before_hash := encode(digest(convert_to(v_row::text, 'UTF8'), 'sha256'), 'hex');
  ELSE
    v_row := to_jsonb(NEW);
    IF TG_OP = 'UPDATE' THEN
      v_before_hash := encode(digest(convert_to(to_jsonb(OLD)::text, 'UTF8'), 'sha256'), 'hex');
    END IF;
    v_after_hash := encode(digest(convert_to(v_row::text, 'UTF8'), 'sha256'), 'hex');
  END IF;

  v_company_id := public.try_uuid(v_row ->> 'company_id');
  v_resource_id := public.try_uuid(v_row ->> 'id');
  IF TG_TABLE_NAME = 'companies' AND v_company_id IS NULL THEN
    v_company_id := v_resource_id;
  END IF;

  INSERT INTO public.audit_logs (
    id,
    company_id,
    actor_id,
    correlation_id,
    action,
    resource,
    resource_id,
    before_hash,
    after_hash
  ) VALUES (
    public.uuid_generate_v7(),
    v_company_id,
    public.current_actor_id(),
    public.current_correlation_id(),
    lower(TG_TABLE_NAME || '.' || TG_OP),
    TG_TABLE_NAME,
    v_resource_id,
    v_before_hash,
    v_after_hash
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
