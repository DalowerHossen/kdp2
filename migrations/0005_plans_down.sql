-- path: migrations/0005_plans_down.sql
-- Rollback of 0005_plans.sql (references drop first).

drop table if exists coupons;
drop table if exists entitlements;
drop table if exists subscriptions;
drop table if exists plan_limits;
drop table if exists plans;
