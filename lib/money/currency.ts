// path: lib/money/currency.ts
import type { Money } from '@/lib/contracts/money';
import { money } from './money';

/**
 * Currency rules (MASTER_PROMPT Rule 2): base currency is USD only. Display
 * conversions are read-only views; the database only ever stores USD.
 */

export const BASE_CURRENCY = 'USD' as const;

export function assertUsd(code: string): void {
  if (code !== BASE_CURRENCY) {
    throw new Error(`Base currency is USD only; received ${code}`);
  }
}

export interface DisplayConversionRate {
  readonly currency: string; // ISO 4217 display currency
  readonly rate: string; // decimal string, frozen at invoice creation time
  readonly frozenAt: string; // ISO timestamp
}

/** Read-only conversion for client-facing display; never persisted. */
export function toDisplayAmount(amount: Money, conversion: DisplayConversionRate): string {
  const converted = money.multiply(amount, conversion.rate);
  return `${converted.amount} ${conversion.currency}`;
}
