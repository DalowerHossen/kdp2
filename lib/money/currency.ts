// path: lib/money/currency.ts
import { z } from 'zod';

export const BASE_CURRENCY = 'USD' as const;

export const baseCurrencySchema = z.enum([BASE_CURRENCY]);
const supportedCurrencyCodes = new Set(Intl.supportedValuesOf('currency'));

export const displayCurrencySchema = z
  .string()
  .length(3)
  .regex(/^[A-Z]{3}$/)
  .refine((code) => supportedCurrencyCodes.has(code));

export type BaseCurrency = z.infer<typeof baseCurrencySchema>;
export type DisplayCurrency = z.infer<typeof displayCurrencySchema>;

export function isDisplayCurrency(value: string): value is DisplayCurrency {
  return displayCurrencySchema.safeParse(value).success;
}
