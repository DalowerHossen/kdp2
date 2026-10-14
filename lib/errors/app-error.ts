// path: lib/errors/app-error.ts
import type { ErrorCode } from '@/lib/contracts/errors';

export interface FieldError {
  readonly field: string;
  readonly message: string;
}

const STATUS_BY_CODE: Readonly<Record<ErrorCode, number>> = {
  validation_failed: 422,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  version_conflict: 409,
  duplicate: 409,
  rate_limited: 429,
  idempotency_replay: 409,
  approval_required: 202,
  storage_failed: 502,
  gateway_failed: 502,
  internal: 500,
} as const;

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: ReadonlyArray<FieldError>;
  readonly correlationId: string;

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      status?: number;
      details?: ReadonlyArray<FieldError> | undefined;
      correlationId?: string;
    },
  ) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.status = options?.status ?? STATUS_BY_CODE[code];
    if (options?.details !== undefined) this.details = options.details;
    this.correlationId = options?.correlationId ?? 'unknown';
  }
}

export class ValidationError extends AppError {
  constructor(message = 'The submitted data is invalid.', details?: ReadonlyArray<FieldError>) {
    super('validation_failed', message, { details });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication is required.') {
    super('unauthorized', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action.') {
    super('forbidden', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'The requested resource was not found.') {
    super('not_found', message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'The request conflicts with the current state.') {
    super('conflict', message);
  }
}

export class VersionConflictError extends AppError {
  constructor(message = 'Another user edited this record. Refresh and try again.') {
    super('version_conflict', message);
  }
}

export class DuplicateError extends AppError {
  constructor(message = 'A record with the same unique fields already exists.') {
    super('duplicate', message);
  }
}

export class RateLimitedError extends AppError {
  constructor(message = 'Too many requests. Try again later.') {
    super('rate_limited', message);
  }
}

export class IdempotencyReplayError extends AppError {
  constructor(message = 'This request was already processed with a different result.') {
    super('idempotency_replay', message);
  }
}

export class ApprovalRequiredError extends AppError {
  constructor(message = 'This action requires approval before it can execute.') {
    super('approval_required', message);
  }
}

export class StorageError extends AppError {
  constructor(message = 'The storage provider could not complete the operation.') {
    super('storage_failed', message);
  }
}

export class GatewayError extends AppError {
  constructor(message = 'The payment processor could not complete the operation.') {
    super('gateway_failed', message);
  }
}

export class InternalError extends AppError {
  constructor(message = 'An unexpected error occurred.') {
    super('internal', message);
  }
}
