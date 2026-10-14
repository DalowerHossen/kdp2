// path: lib/money/money.ts
import Decimal from 'decimal.js';
import type { Money, MoneyOps } from '@/lib/contracts/money';
import { ValidationError } from '@/lib/errors/domain-errors';
import { roundForStorage } from '@/lib/money/rounding';

const MoneyDecimal = Decimal.clone({ precision: 160, rounding: Decimal.ROUND_HALF_UP });
const DECIMAL_INPUT_PATTERN = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/;
const MAX_INPUT_LENGTH = 128;
const MAX_DATABASE_AMOUNT = new MoneyDecimal('99999999999999.9999');
const ZERO_AMOUNT = '0.0000';

function parseDecimalString(value: string): Decimal {
  if (value.length > MAX_INPUT_LENGTH || !DECIMAL_INPUT_PATTERN.test(value)) {
    throw new ValidationError('The monetary value is invalid.');
  }
  const parsed = new MoneyDecimal(value);
  if (!parsed.isFinite()) {
    throw new ValidationError('The monetary value must be finite.');
  }
  return parsed;
}

function parseMoney(value: Money): Decimal {
  if (
    typeof value !== 'object' ||
    value === null ||
    value.currency !== 'USD' ||
    typeof value.amount !== 'string'
  ) {
    throw new ValidationError('Money must use the USD currency contract.');
  }
  const parsed = parseDecimalString(value.amount);
  if (parsed.decimalPlaces() > 4) {
    throw new ValidationError('Money values may not exceed four decimal places.');
  }
  if (parsed.abs().greaterThan(MAX_DATABASE_AMOUNT)) {
    throw new ValidationError('The monetary value exceeds the supported database range.');
  }
  return parsed;
}

function normalize(value: Decimal): string {
  const rounded = new MoneyDecimal(roundForStorage(value));
  if (rounded.abs().greaterThan(MAX_DATABASE_AMOUNT)) {
    throw new ValidationError('The monetary value exceeds the supported database range.');
  }
  return rounded.isZero() ? ZERO_AMOUNT : rounded.toFixed(4, Decimal.ROUND_HALF_UP);
}

function createMoney(amount: string): Money {
  return Object.freeze({ amount, currency: 'USD' as const });
}

function moneyFromDecimal(value: string): Money {
  return createMoney(normalize(parseDecimalString(value)));
}

function add(a: Money, b: Money): Money {
  return createMoney(normalize(parseMoney(a).plus(parseMoney(b))));
}

function subtract(a: Money, b: Money): Money {
  return createMoney(normalize(parseMoney(a).minus(parseMoney(b))));
}

function multiply(a: Money, factor: string): Money {
  return createMoney(normalize(parseMoney(a).mul(parseDecimalString(factor))));
}

function divide(a: Money, divisor: string): Money {
  const parsedDivisor = parseDecimalString(divisor);
  if (parsedDivisor.isZero()) {
    throw new ValidationError('The monetary divisor must not be zero.');
  }
  return createMoney(normalize(parseMoney(a).div(parsedDivisor)));
}

function amountToUnits(value: Decimal): bigint {
  const fixed = value.abs().toFixed(4, Decimal.ROUND_HALF_UP);
  const [whole = '0', fraction = '0000'] = fixed.split('.');
  return BigInt(`${whole}${fraction}`);
}

function unitsToAmount(value: bigint, negative: boolean): string {
  const absolute = value.toString().padStart(5, '0');
  const whole = absolute.slice(0, -4) || '0';
  const fraction = absolute.slice(-4);
  const sign = negative && value !== 0n ? '-' : '';
  return `${sign}${whole}.${fraction}`;
}

function allocate(a: Money, ratios: readonly string[]): readonly Money[] {
  if (ratios.length === 0) {
    throw new ValidationError('At least one allocation ratio is required.');
  }
  const amount = parseMoney(a);
  const negative = amount.isNegative();
  const totalUnits = amountToUnits(amount);
  const parsedRatios = ratios.map((ratio) => parseDecimalString(ratio));
  if (parsedRatios.some((ratio) => ratio.isNegative())) {
    throw new ValidationError('Allocation ratios must not be negative.');
  }
  const ratioTotal = parsedRatios.reduce((total, ratio) => total.plus(ratio), new MoneyDecimal(0));
  if (ratioTotal.isZero()) {
    throw new ValidationError('Allocation ratios must have a positive total.');
  }

  const exactShares = parsedRatios.map((ratio) =>
    new MoneyDecimal(totalUnits.toString()).mul(ratio).div(ratioTotal),
  );
  const baseUnits = exactShares.map((share) => BigInt(share.toFixed(0, Decimal.ROUND_FLOOR)));
  let remainder = totalUnits - baseUnits.reduce((total, units) => total + units, 0n);
  const priority = exactShares
    .map((share, index) => ({ index, fraction: share.minus(share.floor()) }))
    .sort((left, right) => {
      const comparison = right.fraction.comparedTo(left.fraction);
      return comparison === null
        ? left.index - right.index
        : comparison || left.index - right.index;
    });

  for (const item of priority) {
    if (remainder === 0n) {
      break;
    }
    const current = baseUnits[item.index];
    if (current === undefined) {
      throw new ValidationError('Allocation could not be completed.');
    }
    baseUnits[item.index] = current + 1n;
    remainder -= 1n;
  }
  if (remainder !== 0n) {
    throw new ValidationError('Allocation could not be reconciled exactly.');
  }

  return Object.freeze(baseUnits.map((units) => createMoney(unitsToAmount(units, negative))));
}

function isZero(a: Money): boolean {
  return parseMoney(a).isZero();
}

function isNegative(a: Money): boolean {
  const amount = parseMoney(a);
  return !amount.isZero() && amount.isNegative();
}

function compare(a: Money, b: Money): -1 | 0 | 1 {
  const comparison = parseMoney(a).comparedTo(parseMoney(b));
  if (comparison === null) {
    throw new ValidationError('Money values could not be compared.');
  }
  return comparison < 0 ? -1 : comparison > 0 ? 1 : 0;
}

function format(a: Money, opts?: { symbol?: boolean }): string {
  const rounded = parseMoney(a).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const negative = !rounded.isZero() && rounded.isNegative();
  const fixed = rounded.abs().toFixed(2, Decimal.ROUND_HALF_UP);
  const [whole = '0', fraction = '00'] = fixed.split('.');
  let grouped = '';
  for (let index = 0; index < whole.length; index += 1) {
    if (index > 0 && (whole.length - index) % 3 === 0) {
      grouped += ',';
    }
    grouped += whole[index] ?? '';
  }
  const sign = negative ? '-' : '';
  const symbol = opts?.symbol === true ? '$' : '';
  return `${sign}${symbol}${grouped}.${fraction}`;
}

function toDb(a: Money): string {
  const parsed = parseMoney(a);
  if (parsed.abs().greaterThan(MAX_DATABASE_AMOUNT)) {
    throw new ValidationError('The monetary value exceeds the supported database range.');
  }
  return parsed.isZero() ? ZERO_AMOUNT : parsed.toFixed(4, Decimal.ROUND_HALF_UP);
}

function fromDb(raw: string): Money {
  const parsed = parseDecimalString(raw);
  if (parsed.decimalPlaces() > 4) {
    throw new ValidationError('Database money values may not exceed four decimal places.');
  }
  return createMoney(normalize(parsed));
}

export const moneyOps: MoneyOps = Object.freeze({
  fromDecimal: moneyFromDecimal,
  add,
  subtract,
  multiply,
  divide,
  allocate,
  isZero,
  isNegative,
  compare,
  format,
  toDb,
  fromDb,
});
