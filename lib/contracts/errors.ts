// path: lib/contracts/errors.ts
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

export interface ErrorDetail {
  readonly field: string;
  readonly message: string;
}

export interface ApiErrorBody {
  readonly error: {
    readonly code: ErrorCode;
    readonly message: string;
    readonly details?: ReadonlyArray<ErrorDetail>;
    readonly correlation_id: string;
  };
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly correlationId: string;
  readonly details?: ReadonlyArray<ErrorDetail>;

  constructor(
    code: ErrorCode,
    message: string,
    status: number,
    correlationId: string,
    details?: ReadonlyArray<ErrorDetail>,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.correlationId = correlationId;
    if (details !== undefined) {
      this.details = details;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
