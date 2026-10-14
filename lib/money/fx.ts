// path: lib/money/fx.ts
import Decimal from 'decimal.js';
import { z } from 'zod';
import type { Money } from '@/lib/contracts/money';
import { ValidationError } from '@/lib/errors/domain-errors';
import { displayCurrencySchema, type DisplayCurrency } from '@/lib/money/currency';
import { roundForDisplay } from '@/lib/money/rounding';
import { decimalStringSchema, isoUtcDateTimeSchema } from '@/lib/validation/primitives';
import { moneyOps } from '@/lib/money/money';

const FxDecimal = Decimal.clone({ precision: 160, rounding: Decimal.ROUND_HALF_UP });

export interface FxRate {
  readonly baseCurrency: 'USD';
  readonly quoteCurrency: DisplayCurrency;
  readonly rate: string;
  readonly effectiveAt: string;
  readonly provider: string;
}

export interface DisplayMoney {
  readonly amount: string;
  readonly currency: DisplayCurrency;
  readonly effectiveAt: string;
  readonly fxRate: FxRate;
}

const fxRateSchema = z
  .object({
    baseCurrency: z.literal('USD'),
    quoteCurrency: displayCurrencySchema,
    rate: decimalStringSchema.max(128).refine((value) => new FxDecimal(value).greaterThan(0)),
    effectiveAt: isoUtcDateTimeSchema,
    provider: z.string().trim().min(1).max(80),
  })
  .strict();

export function convertForDisplay(amount: Money, rate: FxRate): DisplayMoney {
  const amountString = moneyOps.toDb(amount);
  const parsedRate = fxRateSchema.safeParse(rate);
  if (!parsedRate.success) {
    throw new ValidationError('The exchange rate is invalid.');
  }
  const converted = new FxDecimal(amountString).mul(parsedRate.data.rate);
  const fxRate = Object.freeze(parsedRate.data);
  return Object.freeze({
    amount: roundForDisplay(converted),
    currency: fxRate.quoteCurrency,
    effectiveAt: fxRate.effectiveAt,
    fxRate,
  });
}
