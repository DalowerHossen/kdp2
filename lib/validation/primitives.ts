// path: lib/validation/primitives.ts
import { z } from 'zod';

const UUID_V7_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DECIMAL_STRING_PATTERN = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/;

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127) {
      return true;
    }
  }
  return false;
}

export const uuidV7Schema = z.string().regex(UUID_V7_PATTERN).brand<'UuidV7'>();
export type UuidV7 = z.infer<typeof uuidV7Schema>;

export const companyIdSchema = uuidV7Schema;
export const currencySchema = z.enum(['USD']);
export const decimalStringSchema = z.string().regex(DECIMAL_STRING_PATTERN);
export const isoUtcDateTimeSchema = z.string().datetime({ offset: false });
export const idempotencyKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(255)
  .regex(/^[A-Za-z0-9._:-]+$/);
export const cursorSchema = z.string().trim().min(1).max(2048);
export const pageSizeSchema = z.coerce.number().int().min(1).max(100);
export const safeTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine((value) => !hasControlCharacter(value));

export const moneySchema = z
  .object({
    amount: decimalStringSchema,
    currency: currencySchema,
  })
  .strict();
