// path: types/database.ts
/**
 * Row types for the foundation tables (migrations/0001-0005). Feature steps
 * extend this file through their own services; the authoritative shape is the
 * migration SQL itself.
 */

export interface BaseRow {
  readonly id: string;
  readonly company_id: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly deleted_at: string | null;
  readonly version: number;
}

export interface CompanyRow extends BaseRow {
  readonly company_id: null;
  readonly legal_name: string;
  readonly display_name: string;
  readonly slug: string;
  readonly status: string;
}

export interface UserRow extends BaseRow {
  readonly company_id: null;
  readonly email: string;
  readonly full_name: string;
  readonly status: string;
}

export interface MembershipRow extends BaseRow {
  readonly user_id: string;
  readonly role: 'super_admin' | 'ceo' | 'admin_staff' | 'owner' | 'staff';
  readonly sub_role:
    | 'kyc_reviewer'
    | 'payment_processor'
    | 'support_agent'
    | 'content_manager'
    | 'compliance_officer'
    | 'fraud_analyst'
    | 'finance_analyst'
    | null;
}

export interface PlanRow extends BaseRow {
  readonly code: string;
  readonly name: string;
  readonly monthly_price: string; // numeric(18,4) serialized
  readonly is_active: boolean;
}

export interface SubscriptionRow extends BaseRow {
  readonly plan_id: string;
  readonly status: string;
  readonly current_period_start: string;
  readonly current_period_end: string;
}
