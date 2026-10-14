-- path: migrations/0000_extensions_down.sql
-- Rollback of 0000_extensions.sql. Runs only after every dependent table has
-- been dropped by the later down migrations.

drop function if exists enforce_soft_delete();
drop function if exists attach_standard_triggers(regclass);
drop function if exists audit_trigger();
drop function if exists apply_base_rls(regclass);
drop function if exists is_platform_admin();
drop function if exists current_app_user_id();
drop function if exists current_company_id();
drop function if exists set_updated_at();
drop function if exists uuid_generate_v7();
