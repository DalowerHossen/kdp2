// path: lib/http/correlation.ts
import { createErrorCorrelationId } from '@/lib/errors/app-error';
import { uuidV7Schema, type UuidV7 } from '@/lib/validation/primitives';

export const CORRELATION_HEADER = 'x-correlation-id';

export function resolveRequestCorrelationId(value: string | null): UuidV7 {
  const parsed = uuidV7Schema.safeParse(value);
  return parsed.success ? parsed.data : uuidV7Schema.parse(createErrorCorrelationId());
}

export function getRequestCorrelationId(request: Request): UuidV7 {
  return resolveRequestCorrelationId(request.headers.get(CORRELATION_HEADER));
}

export function addCorrelationHeader(response: Response, correlationId: string): Response {
  const resolvedCorrelationId = resolveRequestCorrelationId(correlationId);
  const headers = new Headers(response.headers);
  headers.set(CORRELATION_HEADER, resolvedCorrelationId);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
