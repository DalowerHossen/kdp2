// path: lib/contracts/auth.ts
import type { RequestContext } from '@/lib/contracts/http';

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

export interface ActorContext {
  readonly userId: string;
  readonly companyId: string | null;
  readonly role: RoleName;
  readonly subRole: AdminSubRole | null;
  readonly permissions: ReadonlySet<string>;
  readonly twoFactorVerified: boolean;
  readonly stepUpVerified: boolean;
}

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
  levelFor(action: string, actor: ActorContext): ApprovalLevel;
  submit(request: ApprovalRequest, ctx: RequestContext): Promise<ApprovalRequest>;
  approve(id: string, ctx: RequestContext): Promise<void>;
  reject(id: string, reason: string, ctx: RequestContext): Promise<void>;
  delegate(fromUserId: string, toUserId: string, until: string): Promise<void>;
}
