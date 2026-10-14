// path: lib/http/request-body.ts
import type { ZodType } from 'zod';
import { AppError } from '@/lib/contracts/errors';
import type { RouteMethod } from '@/lib/contracts/http';
import { ValidationError } from '@/lib/errors/domain-errors';

const MAX_REQUEST_BODY_BYTES = 1_048_576;
const MAX_QUERY_LENGTH = 8192;
const MAX_QUERY_KEY_LENGTH = 128;
const MAX_QUERY_VALUE_LENGTH = 4096;
const MAX_VALIDATION_DETAILS = 20;
const UNSAFE_QUERY_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function queryInput(
  request: Request,
  correlationId: string,
): Readonly<Record<string, string | readonly string[]>> {
  if (request.url.length > MAX_QUERY_LENGTH) {
    throw new ValidationError('The request query is too large.', { correlationId });
  }
  const values = new Map<string, string[]>();
  for (const [key, value] of new URL(request.url).searchParams) {
    if (
      key.length === 0 ||
      key.length > MAX_QUERY_KEY_LENGTH ||
      value.length > MAX_QUERY_VALUE_LENGTH ||
      UNSAFE_QUERY_KEYS.has(key)
    ) {
      throw new ValidationError('A request query parameter is invalid.', { correlationId });
    }
    const current = values.get(key);
    if (current === undefined) {
      values.set(key, [value]);
    } else {
      current.push(value);
    }
  }
  const input: Record<string, string | readonly string[]> = {};
  for (const [key, entries] of values) {
    Object.defineProperty(input, key, {
      configurable: false,
      enumerable: true,
      value: entries.length === 1 ? entries[0] : Object.freeze(entries),
      writable: false,
    });
  }
  return Object.freeze(input);
}

async function readJsonBody(request: Request, correlationId: string): Promise<unknown> {
  if (request.body === null) {
    return undefined;
  }
  const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (contentType !== 'application/json') {
    throw new ValidationError('The request body must use JSON.', { correlationId });
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bodyByteLength = 0;
  try {
    let result = await reader.read();
    while (!result.done) {
      bodyByteLength += result.value.byteLength;
      if (bodyByteLength > MAX_REQUEST_BODY_BYTES) {
        await reader.cancel();
        throw new ValidationError('The request body is too large.', { correlationId });
      }
      chunks.push(result.value);
      result = await reader.read();
    }
    const bytes = new Uint8Array(bodyByteLength);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const body = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (body.trim().length === 0) {
      return undefined;
    }
    try {
      return JSON.parse(body) as unknown;
    } catch {
      throw new ValidationError('The request body is not valid JSON.', { correlationId });
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new ValidationError('The request body could not be read.', { correlationId });
  } finally {
    reader.releaseLock();
  }
}

export async function readRouteInput(
  request: Request,
  method: RouteMethod,
  correlationId: string,
): Promise<unknown> {
  try {
    return method === 'GET'
      ? queryInput(request, correlationId)
      : await readJsonBody(request, correlationId);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new ValidationError('The request input is invalid.', { correlationId });
  }
}

export function parseRouteInput<TInput>(
  schema: ZodType<TInput>,
  value: unknown,
  correlationId: string,
): TInput {
  const parsed = schema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }
  const details = parsed.error.issues.slice(0, MAX_VALIDATION_DETAILS).map((issue) => ({
    field:
      issue.path
        .map((part) => String(part))
        .join('.')
        .slice(0, 128) || 'input',
    message: 'Invalid value.',
  }));
  throw new ValidationError('Request validation failed.', { correlationId, details });
}
