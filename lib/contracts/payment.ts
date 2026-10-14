// path: lib/contracts/payment.ts
/**
 * Payment gateway contract (CONTRACTS.md section 9). Implemented by STEP_07.
 *
 * NOTE (ADDENDUM_PAYMENTS_AUTH.md P-02): the owner has directed that the
 * registry grows from these 7 processors to 16 at integration time. STEP_07
 * declares the expansion in integrator/requests/step-07.json; the integrator
 * then amends this type and CONTRACTS.md section 9. Until that merge, this
 * union intentionally matches CONTRACTS.md exactly.
 */
import type { Money } from './money';

export type GatewayName =
  | 'stripe'
  | 'paypal'
  | 'paddle'
  | 'nmi'
  | 'rapyd'
  | 'adyen'
  | 'custom';

export interface CheckoutInput {
  readonly companyId: string;
  readonly invoiceId: string;
  readonly amount: Money;
  readonly returnUrl: string;
  readonly cancelUrl: string;
  readonly idempotencyKey: string;
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface CheckoutSession {
  readonly sessionId: string;
  readonly redirectUrl: string | null;
  readonly clientSecret: string | null;
  readonly expiresAt: string | null;
}

export interface CaptureResult {
  readonly gatewayPaymentId: string;
  readonly amount: Money;
  readonly status: 'captured' | 'failed';
}

export interface RefundResult {
  readonly gatewayRefundId: string;
  readonly amount: Money;
  readonly status: 'refunded' | 'failed';
}

export interface PayoutInput {
  readonly companyId: string;
  readonly amount: Money;
  readonly destinationRef: string;
  readonly idempotencyKey: string;
}

export interface PayoutResult {
  readonly gatewayPayoutId: string;
  readonly amount: Money;
  readonly status: 'queued' | 'paid' | 'failed';
}

export interface WebhookEvent {
  readonly eventId: string;
  readonly type: string;
  readonly gatewayPaymentId: string | null;
  readonly raw: unknown;
}

export interface GatewayAdapter {
  readonly name: GatewayName;
  createCheckout(input: CheckoutInput): Promise<CheckoutSession>;
  capture(authorizationId: string, amount: Money): Promise<CaptureResult>;
  refund(paymentId: string, amount: Money, reason: string): Promise<RefundResult>;
  createPayout(input: PayoutInput): Promise<PayoutResult>;
  verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookEvent | null>;
}
