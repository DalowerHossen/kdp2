// path: lib/contracts/errors.ts
/**
 * Error contract (CONTRACTS.md section 3). Internal error text never reaches a
 * response body; it goes to the logger with PII scrubbed.
 */
export type ErrorCode =
  | 'validation_failed'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'version_conflict'
  | 'duplicate'
  | 'rate_limited'
  | 'idempotency_replay'
  | 'approval_required'
  | 'storage_failed'
  | 'gateway_failed'
  | 'internal';

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string; // English, user-safe
    details?: ReadonlyArray<{ field: string; message: string }>;
    correlation_id: string;
  };
}

export declare class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: ReadonlyArray<{ field: string; message: string }>;
  readonly correlationId: string;
}
