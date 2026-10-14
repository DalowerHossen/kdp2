// path: lib/errors/domain-errors.ts
import { AppError, createErrorCorrelationId } from '@/lib/errors/app-error';
import type { ErrorDetail } from '@/lib/contracts/errors';

export interface DomainErrorOptions {
  readonly correlationId?: string;
  readonly details?: ReadonlyArray<ErrorDetail>;
}

function correlationIdFor(options: DomainErrorOptions): string {
  return options.correlationId?.trim() || createErrorCorrelationId();
}

export class ValidationError extends AppError {
  constructor(message: string, options: DomainErrorOptions = {}) {
    super('validation_failed', message, 400, correlationIdFor(options), options.details);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication is required.', options: DomainErrorOptions = {}) {
    super('unauthorized', message, 401, correlationIdFor(options), options.details);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(
    message = 'You do not have permission to perform this action.',
    options: DomainErrorOptions = {},
  ) {
    super('forbidden', message, 403, correlationIdFor(options), options.details);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'The requested resource was not found.', options: DomainErrorOptions = {}) {
    super('not_found', message, 404, correlationIdFor(options), options.details);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, options: DomainErrorOptions = {}) {
    super('conflict', message, 409, correlationIdFor(options), options.details);
    this.name = 'ConflictError';
  }
}

export class VersionConflictError extends AppError {
  constructor(
    message = 'Another user edited this record. Reload to see changes.',
    options: DomainErrorOptions = {},
  ) {
    super('version_conflict', message, 409, correlationIdFor(options), options.details);
    this.name = 'VersionConflictError';
  }
}

export class DuplicateError extends AppError {
  constructor(message: string, options: DomainErrorOptions = {}) {
    super('duplicate', message, 409, correlationIdFor(options), options.details);
    this.name = 'DuplicateError';
  }
}

export class RateLimitedError extends AppError {
  constructor(message = 'Too many requests. Try again later.', options: DomainErrorOptions = {}) {
    super('rate_limited', message, 429, correlationIdFor(options), options.details);
    this.name = 'RateLimitedError';
  }
}

export class IdempotencyReplayError extends AppError {
  constructor(
    message = 'This request has already been processed.',
    options: DomainErrorOptions = {},
  ) {
    super('idempotency_replay', message, 409, correlationIdFor(options), options.details);
    this.name = 'IdempotencyReplayError';
  }
}

export class ApprovalRequiredError extends AppError {
  constructor(
    message = 'Approval is required before this action can proceed.',
    options: DomainErrorOptions = {},
  ) {
    super('approval_required', message, 409, correlationIdFor(options), options.details);
    this.name = 'ApprovalRequiredError';
  }
}

export class StorageError extends AppError {
  constructor(options: DomainErrorOptions = {}) {
    super(
      'storage_failed',
      'The file operation could not be completed.',
      502,
      correlationIdFor(options),
    );
    this.name = 'StorageError';
  }
}

export class GatewayError extends AppError {
  constructor(options: DomainErrorOptions = {}) {
    super(
      'gateway_failed',
      'The payment provider could not complete the request.',
      502,
      correlationIdFor(options),
    );
    this.name = 'GatewayError';
  }
}

export class InternalError extends AppError {
  constructor(options: DomainErrorOptions = {}) {
    super('internal', 'An unexpected error occurred.', 500, correlationIdFor(options));
    this.name = 'InternalError';
  }
}
