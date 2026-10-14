// path: lib/errors/index.ts
export { AppError, createErrorCorrelationId } from '@/lib/errors/app-error';
export type { ApiErrorBody, ErrorCode, ErrorDetail } from '@/lib/contracts/errors';
export {
  ApprovalRequiredError,
  ConflictError,
  DuplicateError,
  ForbiddenError,
  GatewayError,
  IdempotencyReplayError,
  InternalError,
  NotFoundError,
  RateLimitedError,
  StorageError,
  UnauthorizedError,
  ValidationError,
  VersionConflictError,
} from '@/lib/errors/domain-errors';
export type { DomainErrorOptions } from '@/lib/errors/domain-errors';
export { mapErrorToResponse } from '@/lib/errors/error-response';
export type { ErrorResponse } from '@/lib/errors/error-response';
