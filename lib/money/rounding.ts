// path: lib/money/rounding.ts
import Decimal from 'decimal.js';
import { ValidationError } from '@/lib/errors/domain-errors';

const DECIMAL_INPUT_PATTERN = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/;
const MAX_INPUT_LENGTH = 128;

function toDecimal(value: Decimal | string): Decimal {
  if (typeof value !== 'string') {
    if (!value.isFinite()) {
      throw new ValidationError('The monetary value must be finite.');
    }
    return value;
  }
  if (value.length > MAX_INPUT_LENGTH || !DECIMAL_INPUT_PATTERN.test(value)) {
    throw new ValidationError('The monetary value is invalid.');
  }
  const parsed = new Decimal(value);
  if (!parsed.isFinite()) {
    throw new ValidationError('The monetary value must be finite.');
  }
  return parsed;
}

export function roundForStorage(value: Decimal | string): string {
  const rounded = toDecimal(value).toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
  return rounded.isZero() ? '0.0000' : rounded.toFixed(4, Decimal.ROUND_HALF_UP);
}

export function roundForDisplay(value: Decimal | string): string {
  const rounded = toDecimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  return rounded.isZero() ? '0.00' : rounded.toFixed(2, Decimal.ROUND_HALF_UP);
}
