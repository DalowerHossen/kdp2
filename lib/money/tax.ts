// path: lib/money/tax.ts
import type { Money } from '@/lib/contracts/money';
import { money } from './money';

/**
 * Tax helpers. Rates are decimal strings (e.g. "0.0825" for 8.25%).
 * Money values stay decimal strings end to end.
 */

export interface TaxSplit {
  readonly net: Money;
  readonly tax: Money;
  readonly gross: Money;
}

/** Given a net amount and a tax rate, returns net/tax/gross that sum exactly. */
export function addTax(net: Money, rate: string): TaxSplit {
  const tax = money.multiply(net, rate);
  const gross = money.add(net, tax);
  return { net, tax, gross };
}

/** Given a gross (tax-inclusive) amount, extracts the net and tax components. */
export function extractTax(gross: Money, rate: string): TaxSplit {
  // net = gross / (1 + rate); keep exact string arithmetic, then tax = gross - net.
  const one = '1.0';
  const divisor = money.add(money.fromDecimal(one), money.fromDecimal(rate));
  const netRaw = money.divide(gross, money.toDb(divisor));
  const tax = money.subtract(gross, netRaw);
  return { net: netRaw, tax, gross: money.add(netRaw, tax) };
}
