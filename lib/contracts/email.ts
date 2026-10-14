// path: lib/contracts/email.ts
/**
 * Email contract (CONTRACTS.md section 8). Sending always goes through the
 * queue; no route handler sends email inline. Implemented by STEP_03.
 */
export type EmailProvider =
  | 'resend'
  | 'sendgrid'
  | 'ses'
  | 'mailgun'
  | 'postmark'
  | 'smtp';

export type EmailScope = 'platform' | 'tenant';

export interface RenderedEmail {
  readonly to: ReadonlyArray<{ email: string; name?: string }>;
  readonly from: { email: string; name: string };
  readonly replyTo?: string;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
  readonly headers?: Readonly<Record<string, string>>;
}

export interface EmailResult {
  readonly provider: EmailProvider;
  readonly externalId: string;
}

export interface QueuedEmail {
  readonly id: string;
  readonly companyId: string | null;
  readonly scope: EmailScope;
  readonly message: RenderedEmail;
  readonly scheduledAt: string;
  readonly attempts: number;
}

export interface EmailAdapter {
  readonly name: EmailProvider;
  isConfigured(scope: EmailScope): Promise<boolean>;
  send(message: RenderedEmail): Promise<EmailResult>;
  verifyWebhook(payload: unknown, signature: string): Promise<boolean>;
}

export interface EmailQueue {
  enqueue(message: QueuedEmail): Promise<string>;
  claimBatch(limit: number): Promise<readonly QueuedEmail[]>; // FOR UPDATE SKIP LOCKED
  markSent(id: string, provider: EmailProvider, externalId: string): Promise<void>;
  markFailed(id: string, reason: string, retryable: boolean): Promise<void>;
}
