// path: lib/errors/map.ts
import { AppError, InternalError, ValidationError } from './app-error';
import type { ApiErrorBody } from '@/lib/contracts/errors';

/** Maps any thrown value to a user-safe AppError. Internal text stays in logs. */
export function toAppError(err: unknown, correlationId: string): AppError {
  if (err instanceof AppError) {
    if (err.correlationId === 'unknown') {
      return new AppError(err.code, err.message, {
        status: err.status,
        ...(err.details !== undefined ? { details: err.details } : {}),
        correlationId,
      });
    }
    return err;
  }
  if (isZodLikeError(err)) {
    return new ValidationError('The submitted data is invalid.', zodDetails(err));
  }
  return new InternalError('An unexpected error occurred.');
}

export function toApiErrorBody(err: AppError, correlationId: string): ApiErrorBody {
  const body: ApiErrorBody = {
    error: {
      code: err.code,
      message: err.message,
      correlation_id: correlationId,
    },
  };
  if (err.details !== undefined && err.details.length > 0) {
    body.error.details = err.details;
  }
  return body;
}

interface ZodIssueLike {
  readonly path: ReadonlyArray<string | number>;
  readonly message: string;
}
interface ZodErrorLike {
  readonly issues: ReadonlyArray<ZodIssueLike>;
}
function isZodLikeError(err: unknown): err is ZodErrorLike {
  return (
    typeof err === 'object' &&
    err !== null &&
    'issues' in err &&
    Array.isArray((err as { issues: unknown }).issues)
  );
}
function zodDetails(err: ZodErrorLike): ReadonlyArray<{ field: string; message: string }> {
  return err.issues.map((issue) => ({
    field: issue.path.join('.') || '_root',
    message: issue.message,
  }));
}
