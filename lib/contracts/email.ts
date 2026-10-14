// path: lib/contracts/email.ts
export type EmailProvider = 'resend' | 'sendgrid' | 'ses' | 'mailgun' | 'postmark' | 'smtp';

export type EmailScope =
  { readonly kind: 'platform' } | { readonly kind: 'company'; readonly companyId: string };

export interface RenderedEmail {
  readonly from: string;
  readonly to: readonly string[];
  readonly subject: string;
  readonly text: string;
  readonly html?: string;
  readonly replyTo?: string;
}

export interface QueuedEmail extends RenderedEmail {
  readonly id: string;
  readonly companyId: string | null;
  readonly scheduledAt: string;
  readonly attempts: number;
}

export interface EmailResult {
  readonly provider: EmailProvider;
  readonly externalId: string;
  readonly acceptedAt: string;
}

export interface EmailAdapter {
  readonly name: EmailProvider;
  isConfigured(scope: EmailScope): Promise<boolean>;
  send(message: RenderedEmail): Promise<EmailResult>;
  verifyWebhook(payload: unknown, signature: string): Promise<boolean>;
}

export interface EmailQueue {
  enqueue(message: QueuedEmail): Promise<string>;
  claimBatch(limit: number): Promise<readonly QueuedEmail[]>;
  markSent(id: string, provider: EmailProvider, externalId: string): Promise<void>;
  markFailed(id: string, reason: string, retryable: boolean): Promise<void>;
}
