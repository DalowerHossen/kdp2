-- path: migrations/0001_platform_core_down.sql
-- Rollback of 0001_platform_core.sql (reverse order of creation).

drop table if exists role_permissions;
drop table if exists permissions;
drop table if exists admin_sub_roles;
drop table if exists roles;
drop table if exists memberships;
drop table if exists users;
drop table if exists companies;

-- These two enums were created in 0001 (their dependents live here); drop
-- them now that the referencing tables are gone.
drop type if exists admin_sub_role_enum;
drop type if exists user_role_enum;
