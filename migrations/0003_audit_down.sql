-- path: migrations/0003_audit_down.sql
-- Rollback of 0003_audit.sql.

drop table if exists _migration_ledger;
drop table if exists audit_log_hash_chain;
drop table if exists audit_logs; -- rows are immutable; only a down migration removes them
