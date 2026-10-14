// path: lib/contracts/auth.ts
/**
 * Roles, sub-roles and the approval engine contract (CONTRACTS.md section 6).
 * Role model per decision C1: 6 top-level roles + 7 admin_staff sub-roles.
 * Clients have no role and no login; they hold HMAC tokens.
 */
export type RoleName = 'super_admin' | 'ceo' | 'admin_staff' | 'owner' | 'staff';

export type AdminSubRole =
  | 'kyc_reviewer'
  | 'payment_processor'
  | 'support_agent'
  | 'content_manager'
  | 'compliance_officer'
  | 'fraud_analyst'
  | 'finance_analyst';

export type ApprovalLevel = 1 | 2 | 3;

export interface ApprovalRequest {
  readonly id: string;
  readonly level: ApprovalLevel;
  readonly action: string;
  readonly payloadHash: string;
  readonly requestedBy: string;
  readonly dualApproval: boolean;
  readonly slaDueAt: string;
}

export interface ApprovalEngine {
  levelFor(action: string, actor: ActorContextLike): ApprovalLevel;
  submit(request: ApprovalRequest, ctx: unknown): Promise<ApprovalRequest>;
  approve(id: string, ctx: unknown): Promise<void>;
  reject(id: string, reason: string, ctx: unknown): Promise<void>;
  delegate(fromUserId: string, toUserId: string, until: string): Promise<void>;
}

/** Minimal actor shape used by the engine; the full ActorContext lives in http.ts. */
export interface ActorContextLike {
  readonly userId: string;
  readonly companyId: string | null;
  readonly role: RoleName;
  readonly subRole: AdminSubRole | null;
}

export const ROLE_ORDER: Readonly<Record<RoleName, number>> = {
  super_admin: 5,
  ceo: 4,
  admin_staff: 3,
  owner: 2,
  staff: 1,
} as const;
