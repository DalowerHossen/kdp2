// path: lib/contracts/money.ts
export interface Money {
  readonly amount: string;
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
  toDb(a: Money): string;
  fromDb(raw: string): Money;
}
