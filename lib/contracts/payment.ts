// path: lib/contracts/payment.ts
import type { Money } from '@/lib/contracts/money';

export type GatewayName = 'stripe' | 'paypal' | 'paddle' | 'nmi' | 'rapyd' | 'adyen' | 'custom';

export interface CheckoutLineItem {
  readonly description: string;
  readonly quantity: string;
  readonly unitAmount: Money;
}

export interface CheckoutInput {
  readonly companyId: string;
  readonly customerId: string;
  readonly items: readonly CheckoutLineItem[];
  readonly idempotencyKey: string;
  readonly successUrl: string;
  readonly cancelUrl: string;
}

export interface CheckoutSession {
  readonly id: string;
  readonly url: string;
  readonly expiresAt: string;
}

export interface CaptureResult {
  readonly gatewayReference: string;
  readonly amount: Money;
  readonly status: 'captured' | 'pending';
}

export interface RefundResult {
  readonly gatewayReference: string;
  readonly amount: Money;
  readonly status: 'refunded' | 'pending';
}

export interface PayoutInput {
  readonly companyId: string;
  readonly payoutId: string;
  readonly amount: Money;
  readonly destination: Readonly<Record<string, string>>;
  readonly idempotencyKey: string;
}

export interface PayoutResult {
  readonly gatewayReference: string;
  readonly amount: Money;
  readonly status: 'pending' | 'succeeded';
}

export interface WebhookEvent {
  readonly id: string;
  readonly type: string;
  readonly createdAt: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface GatewayAdapter {
  readonly name: GatewayName;
  createCheckout(input: CheckoutInput): Promise<CheckoutSession>;
  capture(authorizationId: string, amount: Money): Promise<CaptureResult>;
  refund(paymentId: string, amount: Money, reason: string): Promise<RefundResult>;
  createPayout(input: PayoutInput): Promise<PayoutResult>;
  verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookEvent | null>;
}
