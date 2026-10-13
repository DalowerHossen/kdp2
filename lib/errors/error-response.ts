// path: lib/errors/error-response.ts
import { AppError } from '@/lib/contracts/errors';
import type { ApiErrorBody, ErrorDetail, ErrorCode } from '@/lib/contracts/errors';
import { createErrorCorrelationId } from '@/lib/errors/app-error';

export interface ErrorResponse {
  readonly status: number;
  readonly body: ApiErrorBody;
}

function safeDetails(error: AppError): ReadonlyArray<ErrorDetail> | undefined {
  if (error.status >= 500 || error.code === 'internal') {
    return undefined;
  }
  return error.details;
}

export function mapErrorToResponse(error: unknown, correlationId: string): ErrorResponse {
  const applicationError = error instanceof AppError ? error : undefined;
  const code: ErrorCode = applicationError?.code ?? 'internal';
  const message =
    applicationError !== undefined && code !== 'internal' && applicationError.status < 500
      ? applicationError.message
      : 'An unexpected error occurred.';
  const details = applicationError === undefined ? undefined : safeDetails(applicationError);
  const resolvedCorrelationId =
    correlationId.trim() || applicationError?.correlationId.trim() || createErrorCorrelationId();
  const errorBody: ApiErrorBody['error'] = {
    code,
    message,
    correlation_id: resolvedCorrelationId,
    ...(details === undefined ? {} : { details }),
  };

  return {
    status: applicationError?.status ?? 500,
    body: { error: errorBody },
  };
}
