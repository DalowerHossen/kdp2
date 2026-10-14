-- path: migrations/0002_enums.sql
-- STEP_00 batch 4: every shared enum, created once, in full (playbook rule
-- 4.5). Value lists are deliberately generous: later steps may add values
-- only via ALTER TYPE ... ADD VALUE IF NOT EXISTS in their own migration
-- range, declared in their integrator request file.
-- user_role_enum and admin_sub_role_enum are created in 0001 (memberships
-- depends on them); their values are re-asserted here defensively.

do $do$
begin
  if exists (select 1 from pg_type where typname = 'user_role_enum') then
    execute $x$alter type user_role_enum add value if not exists 'super_admin'$x$;
    execute $x$alter type user_role_enum add value if not exists 'ceo'$x$;
    execute $x$alter type user_role_enum add value if not exists 'admin_staff'$x$;
    execute $x$alter type user_role_enum add value if not exists 'owner'$x$;
    execute $x$alter type user_role_enum add value if not exists 'staff'$x$;
  end if;
  if exists (select 1 from pg_type where typname = 'admin_sub_role_enum') then
    execute $x$alter type admin_sub_role_enum add value if not exists 'kyc_reviewer'$x$;
    execute $x$alter type admin_sub_role_enum add value if not exists 'payment_processor'$x$;
    execute $x$alter type admin_sub_role_enum add value if not exists 'support_agent'$x$;
    execute $x$alter type admin_sub_role_enum add value if not exists 'content_manager'$x$;
    execute $x$alter type admin_sub_role_enum add value if not exists 'compliance_officer'$x$;
    execute $x$alter type admin_sub_role_enum add value if not exists 'fraud_analyst'$x$;
    execute $x$alter type admin_sub_role_enum add value if not exists 'finance_analyst'$x$;
  end if;
end
$do$;

-- Helper pattern: create-if-missing per enum.

do $do$ begin if not exists (select 1 from pg_type where typname = 'approval_status_enum') then
  create type approval_status_enum as enum ('pending', 'approved', 'rejected', 'cancelled', 'escalated', 'expired');
end if; end $do$;

do $do$ begin if not exists (select 1 from pg_type where typname = 'invoice_status_enum') then
  create type invoice_status_enum as enum
    ('draft', 'sent', 'viewed', 'partially_paid', 'paid', 'overdue', 'void', 'cancelled', 'refunded');
end if; end $do$;

do $do$ begin if not exists (select 1 from pg_type where typname = 'payment_status_enum') then
  create type payment_status_enum as enum
    ('initiated', 'pending', 'authorized', 'captured', 'failed', 'declined',
     'cancelled', 'held', 'review', 'refunded', 'partially_refunded', 'chargeback');
end if; end $do$;

do $do$ begin if not exists (select 1 from pg_type where typname = 'payment_method_kind_enum') then
  create type payment_method_kind_enum as enum
    ('card', 'bank_account', 'wallet', 'local_method', 'mobile_wallet', 'other');
end if; end $do$;

do $do$ begin if not exists (select 1 from pg_type where typname = 'refund_status_enum') then
  create type refund_status_enum as enum ('pending', 'processing', 'succeeded', 'failed', 'cancelled');
end if; end $do$;

do $do$ begin if not exists (select 1 from pg_type where typname = 'payout_status_enum') then
  create type payout_status_enum as enum
    ('queued', 'pending_approval', 'processing', 'paid', 'failed', 'cancelled', 'returned');
end if; end $do$;

do $do$ begin if not exists (select 1 from pg_type where typname = 'kyc_status_enum') then
  create type kyc_status_enum as enum ('not_started', 'pending', 'in_review', 'verified', 'rejected', 'expired');
end if; end $do$;

do $do$ begin if not exists (select 1 from pg_type where typname = 'dispute_status_enum') then
  create type dispute_status_enum as enum
    ('open', 'evidence_due', 'evidence_submitted', 'won', 'lost', 'closed');
end if; end $do$;

do $do$ begin if not exists (select 1 from pg_type where typname = 'subscription_status_enum') then
  create type subscription_status_enum as enum ('trialing', 'active', 'past_due', 'paused', 'cancelled', 'expired');
end if; end $do$;

do $do$ begin if not exists (select 1 from pg_type where typname = 'coupon_kind_enum') then
  create type coupon_kind_enum as enum ('percent', 'fixed_amount');
end if; end $do$;

do $do$ begin if not exists (select 1 from pg_type where typname = 'file_category_enum') then
  create type file_category_enum as enum
    ('invoice', 'receipt', 'kyc', 'logo', 'branding', 'attachment', 'contract',
     'evidence', 'payslip', 'report', 'media', 'expense', 'employee', 'other');
end if; end $do$;

do $do$ begin if not exists (select 1 from pg_type where typname = 'storage_provider_enum') then
  create type storage_provider_enum as enum ('google-drive', 'supabase-storage');
end if; end $do$;

do $do$ begin if not exists (select 1 from pg_type where typname = 'email_status_enum') then
  create type email_status_enum as enum
    ('queued', 'sending', 'sent', 'delivered', 'bounced', 'complained', 'failed', 'suppressed');
end if; end $do$;

do $do$ begin if not exists (select 1 from pg_type where typname = 'email_template_kind_enum') then
  create type email_template_kind_enum as enum ('transactional', 'marketing', 'system');
end if; end $do$;

do $do$ begin if not exists (select 1 from pg_type where typname = 'notification_channel_enum') then
  create type notification_channel_enum as enum ('email', 'in_app', 'sms', 'whatsapp', 'push');
end if; end $do$;

do $do$ begin if not exists (select 1 from pg_type where typname = 'notification_status_enum') then
  create type notification_status_enum as enum ('pending', 'sent', 'delivered', 'read', 'failed');
end if; end $do$;

do $do$ begin if not exists (select 1 from pg_type where typname = 'cron_run_status_enum') then
  create type cron_run_status_enum as enum ('running', 'succeeded', 'failed', 'skipped');
end if; end $do$;

do $do$ begin if not exists (select 1 from pg_type where typname = 'ticket_status_enum') then
  create type ticket_status_enum as enum ('open', 'pending', 'answered', 'resolved', 'closed');
end if; end $do$;

do $do$ begin if not exists (select 1 from pg_type where typname = 'ticket_priority_enum') then
  create type ticket_priority_enum as enum ('low', 'normal', 'high', 'urgent');
end if; end $do$;

do $do$ begin if not exists (select 1 from pg_type where typname = 'expense_status_enum') then
  create type expense_status_enum as enum ('draft', 'submitted', 'approved', 'rejected', 'reimbursed');
end if; end $do$;

do $do$ begin if not exists (select 1 from pg_type where typname = 'po_status_enum') then
  create type po_status_enum as enum ('draft', 'sent', 'partially_received', 'received', 'cancelled', 'closed');
end if; end $do$;

do $do$ begin if not exists (select 1 from pg_type where typname = 'stock_movement_kind_enum') then
  create type stock_movement_kind_enum as enum ('in', 'out', 'adjustment', 'transfer');
end if; end $do$;

do $do$ begin if not exists (select 1 from pg_type where typname = 'payroll_run_status_enum') then
  create type payroll_run_status_enum as enum
    ('draft', 'calculating', 'pending_approval', 'approved', 'paid', 'failed', 'cancelled');
end if; end $do$;

do $do$ begin if not exists (select 1 from pg_type where typname = 'employee_status_enum') then
  create type employee_status_enum as enum ('active', 'on_leave', 'suspended', 'terminated');
end if; end $do$;

do $do$ begin if not exists (select 1 from pg_type where typname = 'integration_status_enum') then
  create type integration_status_enum as enum ('connected', 'pending', 'error', 'disconnected');
end if; end $do$;

do $do$ begin if not exists (select 1 from pg_type where typname = 'api_key_status_enum') then
  create type api_key_status_enum as enum ('active', 'suspended', 'revoked', 'expired');
end if; end $do$;

do $do$ begin if not exists (select 1 from pg_type where typname = 'webhook_delivery_status_enum') then
  create type webhook_delivery_status_enum as enum ('pending', 'delivered', 'failed', 'retrying');
end if; end $do$;

do $do$ begin if not exists (select 1 from pg_type where typname = 'ledger_entry_status_enum') then
  create type ledger_entry_status_enum as enum ('draft', 'posted', 'reversed');
end if; end $do$;

do $do$ begin if not exists (select 1 from pg_type where typname = 'fraud_signal_kind_enum') then
  create type fraud_signal_kind_enum as enum
    ('velocity', 'geo_mismatch', 'blacklist', 'processor', 'device', 'network', 'manual');
end if; end $do$;

do $do$ begin if not exists (select 1 from pg_type where typname = 'fraud_case_status_enum') then
  create type fraud_case_status_enum as enum ('open', 'under_review', 'cleared', 'confirmed', 'escalated');
end if; end $do$;

do $do$ begin if not exists (select 1 from pg_type where typname = 'wallet_txn_kind_enum') then
  create type wallet_txn_kind_enum as enum ('credit', 'debit', 'hold', 'release', 'withdrawal', 'adjustment');
end if; end $do$;

do $do$ begin if not exists (select 1 from pg_type where typname = 'gateway_mode_enum') then
  create type gateway_mode_enum as enum ('sandbox', 'live');
end if; end $do$;

do $do$ begin if not exists (select 1 from pg_type where typname = 'tenant_status_enum') then
  create type tenant_status_enum as enum ('active', 'suspended', 'archived');
end if; end $do$;

do $do$ begin if not exists (select 1 from pg_type where typname = 'user_status_enum') then
  create type user_status_enum as enum ('invited', 'active', 'suspended', 'deactivated');
end if; end $do$;
