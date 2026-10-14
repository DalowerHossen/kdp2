// path: lib/money/tax.ts
import Decimal from 'decimal.js';
import type { Money } from '@/lib/contracts/money';
import { ValidationError } from '@/lib/errors/domain-errors';
import { decimalStringSchema } from '@/lib/validation/primitives';
import { moneyOps } from '@/lib/money/money';

export interface TaxBreakdown {
  readonly net: Money;
  readonly tax: Money;
  readonly total: Money;
}

function parseTaxRate(value: string): Decimal {
  const parsed = decimalStringSchema.max(128).safeParse(value);
  if (!parsed.success) {
    throw new ValidationError('The tax rate is invalid.');
  }
  const rate = new Decimal(parsed.data);
  if (rate.isNegative() || rate.greaterThan(1)) {
    throw new ValidationError('The tax rate must be between zero and one.');
  }
  return rate;
}

export function calculateTaxExclusive(net: Money, rate: string): TaxBreakdown {
  const parsedNet = moneyOps.fromDb(moneyOps.toDb(net));
  const parsedRate = parseTaxRate(rate);
  const tax = moneyOps.multiply(parsedNet, parsedRate.toString());
  return Object.freeze({
    net: parsedNet,
    tax,
    total: moneyOps.add(parsedNet, tax),
  });
}

export function calculateTaxInclusive(total: Money, rate: string): TaxBreakdown {
  const parsedTotal = moneyOps.fromDb(moneyOps.toDb(total));
  const parsedRate = parseTaxRate(rate);
  const divisor = parsedRate.plus(1).toString();
  const net = moneyOps.divide(parsedTotal, divisor);
  const tax = moneyOps.subtract(parsedTotal, net);
  return Object.freeze({ net, tax, total: parsedTotal });
}
