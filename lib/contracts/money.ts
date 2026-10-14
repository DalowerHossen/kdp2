// path: lib/contracts/money.ts
/**
 * Money contract (CONTRACTS.md section 2). Money is ALWAYS a decimal string and
 * ALWAYS USD. No function anywhere may accept or return a JS number for a
 * monetary value; scripts/check-money-types.sh enforces this.
 */
export interface Money {
  readonly amount: string; // decimal string, never a JS number
  readonly currency: 'USD';
}

export interface MoneyOps {
  fromDecimal(value: string): Money;
  add(a: Money, b: Money): Money;
  subtract(a: Money, b: Money): Money;
  multiply(a: Money, factor: string): Money;
  divide(a: Money, divisor: string): Money;
  allocate(a: Money, ratios: readonly string[]): readonly Money[];
  isZero(a: Money): boolean;
  isNegative(a: Money): boolean;
  compare(a: Money, b: Money): -1 | 0 | 1;
  format(a: Money, opts?: { symbol?: boolean }): string;
  toDb(a: Money): string; // numeric(18,4) literal
  fromDb(raw: string): Money;
}
