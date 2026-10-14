-- path: migrations/0002_enums_down.sql
-- Rollback of 0002_enums.sql. Dropped in reverse dependency order. Runs
-- after 0005/0004/0003/0001 downs so no table still references the types.

drop type if exists user_status_enum;
drop type if exists tenant_status_enum;
drop type if exists gateway_mode_enum;
drop type if exists wallet_txn_kind_enum;
drop type if exists fraud_case_status_enum;
drop type if exists fraud_signal_kind_enum;
drop type if exists ledger_entry_status_enum;
drop type if exists webhook_delivery_status_enum;
drop type if exists api_key_status_enum;
drop type if exists integration_status_enum;
drop type if exists employee_status_enum;
drop type if exists payroll_run_status_enum;
drop type if exists stock_movement_kind_enum;
drop type if exists po_status_enum;
drop type if exists expense_status_enum;
drop type if exists ticket_priority_enum;
drop type if exists ticket_status_enum;
drop type if exists cron_run_status_enum;
drop type if exists notification_status_enum;
drop type if exists notification_channel_enum;
drop type if exists email_template_kind_enum;
drop type if exists email_status_enum;
drop type if exists storage_provider_enum;
drop type if exists file_category_enum;
drop type if exists coupon_kind_enum;
drop type if exists subscription_status_enum;
drop type if exists dispute_status_enum;
drop type if exists kyc_status_enum;
drop type if exists payout_status_enum;
drop type if exists refund_status_enum;
drop type if exists payment_method_kind_enum;
drop type if exists payment_status_enum;
drop type if exists invoice_status_enum;
drop type if exists approval_status_enum;

-- user_role_enum and admin_sub_role_enum were created in 0001_platform_core.sql
-- and are still referenced by its tables at this point in the rollback order;
-- 0001_platform_core_down.sql drops them after dropping its tables.
