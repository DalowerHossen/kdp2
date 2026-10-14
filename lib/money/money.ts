// path: lib/money/money.ts
import Decimal from 'decimal.js';
import type { Money, MoneyOps } from '@/lib/contracts/money';

/**
 * Money value type over decimal.js (CONTRACTS.md section 2, IMPLEMENTATION X2).
 * Storage rounds half-up at 4 decimals; display rounds half-up at 2 decimals.
 * A JavaScript number is NEVER accepted or returned for a monetary value.
 */

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP, toExpNeg: -30, toExpPos: 40 });

export const STORAGE_DECIMALS = 4;
export const DISPLAY_DECIMALS = 2;

const DECIMAL_RE = /^-?\d+(\.\d+)?$/;

function assertDecimalString(value: string, what: string): Decimal {
  if (typeof value !== 'string' || !DECIMAL_RE.test(value)) {
    throw new Error(`Money ${what} must be a decimal string, got: ${JSON.stringify(value)}`);
  }
  return new Decimal(value);
}

function toMoney(d: Decimal): Money {
  return { amount: d.toFixed(STORAGE_DECIMALS), currency: 'USD' };
}

function dec(a: Money): Decimal {
  return assertDecimalString(a.amount, 'amount');
}

function requireUsd(a: Money): void {
  if (a.currency !== 'USD') {
    throw new Error(`Money currency must be USD, got ${a.currency as string}`);
  }
}

export const money: MoneyOps = {
  fromDecimal(value: string): Money {
    return toMoney(assertDecimalString(value, 'input'));
  },

  add(a: Money, b: Money): Money {
    requireUsd(a);
    requireUsd(b);
    return toMoney(dec(a).plus(dec(b)));
  },

  subtract(a: Money, b: Money): Money {
    requireUsd(a);
    requireUsd(b);
    return toMoney(dec(a).minus(dec(b)));
  },

  multiply(a: Money, factor: string): Money {
    requireUsd(a);
    return toMoney(dec(a).times(assertDecimalString(factor, 'factor')));
  },

  divide(a: Money, divisor: string): Money {
    requireUsd(a);
    const d = assertDecimalString(divisor, 'divisor');
    if (d.isZero()) throw new Error('Money divide by zero');
    return toMoney(dec(a).div(d));
  },

  allocate(a: Money, ratios: readonly string[]): readonly Money[] {
    // Remainder-safe largest-remainder allocation: results always sum to the input.
    requireUsd(a);
    if (ratios.length === 0) throw new Error('Money allocate requires at least one ratio');
    const total = dec(a);
    const weightSum = ratios.reduce(
      (acc, r) => acc.plus(assertDecimalString(r, 'ratio')),
      new Decimal(0),
    );
    if (weightSum.lte(0)) throw new Error('Money allocate ratios must sum to a positive value');

    const rawShares = ratios.map((r) => total.times(new Decimal(r)).div(weightSum));
    const floored = rawShares.map((s) => s.toDecimalPlaces(STORAGE_DECIMALS, Decimal.ROUND_DOWN));
    const assigned = floored.reduce((acc, s) => acc.plus(s), new Decimal(0));
    let remainderUnits = total
      .minus(assigned)
      .times(new Decimal(10).pow(STORAGE_DECIMALS))
      .round()
      .toNumber();

    // Distribute remaining units to the shares with the largest fractional parts.
    const order = rawShares
      .map((s, i) => ({ i, frac: s.minus(floored[i] ?? 0) }))
      .sort((x, y) => y.frac.cmp(x.frac));
    const unit = new Decimal(1).div(new Decimal(10).pow(STORAGE_DECIMALS));
    const result = floored.map((s) => s);
    for (const { i } of order) {
      if (remainderUnits <= 0) break;
      const current = result[i];
      if (current === undefined) continue;
      result[i] = current.plus(unit);
      remainderUnits -= 1;
    }
    return result.map((s) => toMoney(s));
  },

  isZero(a: Money): boolean {
    requireUsd(a);
    return dec(a).isZero();
  },

  isNegative(a: Money): boolean {
    requireUsd(a);
    return dec(a).isNegative();
  },

  compare(a: Money, b: Money): -1 | 0 | 1 {
    requireUsd(a);
    requireUsd(b);
    const c = dec(a).cmp(dec(b));
    return c < 0 ? -1 : c > 0 ? 1 : 0;
  },

  format(a: Money, opts?: { symbol?: boolean }): string {
    requireUsd(a);
    const grouped = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: DISPLAY_DECIMALS,
      maximumFractionDigits: DISPLAY_DECIMALS,
    }).format(Number(dec(a).toFixed(DISPLAY_DECIMALS)));
    return opts?.symbol === false ? grouped : `$${grouped}`;
  },

  toDb(a: Money): string {
    requireUsd(a);
    return dec(a).toFixed(STORAGE_DECIMALS);
  },

  fromDb(raw: string): Money {
    return toMoney(assertDecimalString(raw, 'database value'));
  },
};

export const ZERO_MONEY: Money = { amount: '0.0000', currency: 'USD' };
