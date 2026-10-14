-- path: migrations/0004_security_down.sql
-- Rollback of 0004_security.sql (references drop first).

drop table if exists webhook_processed_events;
drop table if exists idempotency_keys;
drop table if exists rate_limit_buckets;
drop table if exists login_attempts;
drop table if exists sessions;
drop table if exists device_fingerprints;
drop table if exists ip_reputation;
