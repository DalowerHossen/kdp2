// path: lib/logger/correlation.ts
/**
 * Correlation ID helpers. Every request carries one ID from edge to database
 * to logs. Incoming IDs are accepted when they match a strict shape; otherwise
 * a new UUID is minted.
 */
export const CORRELATION_HEADER = 'x-correlation-id';

const VALID_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,127}$/;

export function mintCorrelationId(): string {
  return globalThis.crypto.randomUUID();
}

export function resolveCorrelationId(incoming: string | null): string {
  if (incoming !== null && VALID_ID.test(incoming)) {
    return incoming;
  }
  return mintCorrelationId();
}
