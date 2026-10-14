// path: config/constants.ts
/**
 * Platform-wide constants. Domain numbers (lockouts, velocity limits, quotas)
 * belong to the step that owns the domain; this file holds only cross-cutting
 * constants every step may read. This file is STEP_00/integrator-owned.
 */

export const APP_NAME = 'KD SOLUTION IT' as const;

export const BASE_CURRENCY = 'USD' as const;
export const MONEY_STORAGE_DECIMALS = 4;
export const MONEY_DISPLAY_DECIMALS = 2;

export const CORRELATION_HEADER = 'x-correlation-id' as const;
export const IDEMPOTENCY_HEADER = 'idempotency-key' as const;
export const CSRF_COOKIE_NAME = 'kd_csrf' as const;
export const CSRF_HEADER_NAME = 'x-csrf-token' as const;

export const CIPHER_SUITE = 'aes-256-gcm' as const;

export const PAGINATION = {
  defaultPageSize: 25,
  maxPageSize: 100,
} as const;

export const HTTP = {
  ok: 200,
  accepted: 202,
  unprocessable: 422,
} as const;
