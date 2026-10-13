// path: lib/http/idempotency.ts
import { z } from 'zod';
import { AppError } from '@/lib/contracts/errors';
import {
  ConflictError,
  IdempotencyReplayError,
  InternalError,
  ValidationError,
} from '@/lib/errors/domain-errors';
import { addCorrelationHeader } from '@/lib/http/correlation';
import { idempotencyKeySchema } from '@/lib/validation/primitives';

export interface CachedHttpResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

export type IdempotencyClaim =
  | { readonly kind: 'acquired' }
  | { readonly kind: 'in_progress' }
  | {
      readonly kind: 'replay';
      readonly requestHash: string;
      readonly response: CachedHttpResponse;
    };

export interface IdempotencyStore {
  /** Acquires or reads a request claim atomically across all application workers. */
  claim(keyHash: string, requestHash: string, expiresAt: string): Promise<IdempotencyClaim>;
  complete(keyHash: string, requestHash: string, response: CachedHttpResponse): Promise<void>;
  release(keyHash: string, requestHash: string): Promise<void>;
}

export const DEFAULT_IDEMPOTENCY_WINDOW_SECONDS = 86_400;
const MAX_IDEMPOTENCY_WINDOW_SECONDS = 604_800;
const MAX_RESPONSE_BODY_BYTES = 1_048_576;
const MAX_CANONICAL_NODES = 10_000;
const MAX_CANONICAL_DEPTH = 32;
const CACHEABLE_HEADERS = ['cache-control', 'content-type', 'etag', 'location'] as const;
const CACHEABLE_HEADER_SET = new Set<string>(CACHEABLE_HEADERS);
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

const cachedResponseSchema = z
  .object({
    status: z.number().int().min(200).max(299),
    headers: z.record(z.string().max(1024)),
    body: z.string().max(MAX_RESPONSE_BODY_BYTES),
  })
  .strict();
const claimSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('acquired') }).strict(),
  z.object({ kind: z.literal('in_progress') }).strict(),
  z
    .object({
      kind: z.literal('replay'),
      requestHash: z.string().regex(SHA256_PATTERN),
      response: cachedResponseSchema,
    })
    .strict(),
]);
const executionInputSchema = z
  .object({
    key: idempotencyKeySchema,
    scope: z.tuple([
      z.enum(['tenant', 'user']),
      z.string().trim().min(1).max(255),
      z.string().trim().min(1).max(128),
      z.string().trim().min(1).max(128),
    ]),
    windowSeconds: z.number().int().min(1).max(MAX_IDEMPOTENCY_WINDOW_SECONDS),
    correlationId: z.string().min(1).max(128),
  })
  .strict();

type IdempotencyScope = readonly ['tenant' | 'user', string, string, string];

interface CanonicalizationState {
  readonly ancestors: WeakSet<object>;
  nodes: number;
}

function canonicalJson(value: unknown, state: CanonicalizationState, depth: number): string {
  state.nodes += 1;
  if (state.nodes > MAX_CANONICAL_NODES || depth > MAX_CANONICAL_DEPTH) {
    throw new ValidationError('The request is too complex for idempotency.');
  }
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'string' || typeof value === 'boolean') {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) {
      throw new ValidationError('The request cannot be hashed safely.');
    }
    return serialized;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new ValidationError('The request cannot be hashed safely.');
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    const arrayValue: readonly unknown[] = value;
    if (state.ancestors.has(arrayValue)) {
      throw new ValidationError('Cyclic request values are not supported.');
    }
    state.ancestors.add(arrayValue);
    const items = arrayValue.map((item) => canonicalJson(item, state, depth + 1));
    state.ancestors.delete(arrayValue);
    return `[${items.join(',')}]`;
  }
  if (typeof value === 'object') {
    const recordValue = value as Readonly<Record<string, unknown>>;
    const prototype = Object.getPrototypeOf(recordValue);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new ValidationError('The request contains unsupported values.');
    }
    if (state.ancestors.has(recordValue)) {
      throw new ValidationError('Cyclic request values are not supported.');
    }
    state.ancestors.add(recordValue);
    const entries = Object.keys(recordValue)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(recordValue[key], state, depth + 1)}`);
    state.ancestors.delete(recordValue);
    return `{${entries.join(',')}}`;
  }
  throw new ValidationError('The request contains unsupported values.');
}

async function sha256(value: string): Promise<string> {
  try {
    const digest = await globalThis.crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(value),
    );
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(
      '',
    );
  } catch {
    throw new InternalError();
  }
}

export function readIdempotencyKey(request: Request): string {
  const parsed = idempotencyKeySchema.safeParse(request.headers.get('idempotency-key'));
  if (!parsed.success) {
    throw new ValidationError('A valid Idempotency-Key header is required.');
  }
  return parsed.data;
}

export async function hashIdempotencyPayload(value: unknown): Promise<string> {
  const canonical = canonicalJson(value, { ancestors: new WeakSet<object>(), nodes: 0 }, 0);
  return sha256(canonical);
}

async function hashIdempotencyKey(value: string, scope: IdempotencyScope): Promise<string> {
  return sha256(JSON.stringify([...scope, value]));
}

async function readBoundedResponseBody(response: Response): Promise<string> {
  if (response.body === null) {
    return '';
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bodyByteLength = 0;
  try {
    let result = await reader.read();
    while (!result.done) {
      bodyByteLength += result.value.byteLength;
      if (bodyByteLength > MAX_RESPONSE_BODY_BYTES) {
        await reader.cancel();
        throw new InternalError();
      }
      chunks.push(result.value);
      result = await reader.read();
    }
    const body = new Uint8Array(bodyByteLength);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder('utf-8', { fatal: true }).decode(body);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new InternalError();
  } finally {
    reader.releaseLock();
  }
}

function cacheableHeaders(response: Response): Readonly<Record<string, string>> {
  const headers: Record<string, string> = {};
  for (const name of CACHEABLE_HEADERS) {
    const value = response.headers.get(name);
    if (value !== null) {
      headers[name] = value;
    }
  }
  return Object.freeze(headers);
}

async function captureResponse(response: Response): Promise<CachedHttpResponse> {
  const contentType = response.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  const isTextResponse =
    response.body === null ||
    contentType === 'application/json' ||
    contentType?.endsWith('+json') === true ||
    contentType?.startsWith('text/') === true;
  if (!isTextResponse) {
    throw new InternalError();
  }
  const body = await readBoundedResponseBody(response);
  const parsed = cachedResponseSchema.safeParse({
    status: response.status,
    headers: cacheableHeaders(response),
    body,
  });
  if (!parsed.success) {
    throw new InternalError();
  }
  return parsed.data;
}

function responseFromCache(response: CachedHttpResponse, correlationId: string): Response {
  const parsed = cachedResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new InternalError({ correlationId });
  }
  const headerEntries = Object.entries(parsed.data.headers);
  if (
    headerEntries.length > CACHEABLE_HEADERS.length ||
    new TextEncoder().encode(parsed.data.body).byteLength > MAX_RESPONSE_BODY_BYTES
  ) {
    throw new InternalError({ correlationId });
  }
  const headers = new Headers();
  for (const [name, value] of headerEntries) {
    if (!CACHEABLE_HEADER_SET.has(name)) {
      throw new InternalError({ correlationId });
    }
    headers.set(name, value);
  }
  const body = [204, 205, 304].includes(parsed.data.status) ? null : parsed.data.body;
  return addCorrelationHeader(
    new Response(body, {
      status: parsed.data.status,
      headers,
    }),
    correlationId,
  );
}

async function releaseClaim(
  store: IdempotencyStore,
  keyHash: string,
  requestHash: string,
  correlationId: string,
): Promise<void> {
  try {
    await store.release(keyHash, requestHash);
  } catch {
    throw new InternalError({ correlationId });
  }
}

async function acquireClaim(
  store: IdempotencyStore,
  keyHash: string,
  requestHash: string,
  expiresAt: string,
  correlationId: string,
): Promise<IdempotencyClaim> {
  try {
    const parsed = claimSchema.safeParse(await store.claim(keyHash, requestHash, expiresAt));
    if (!parsed.success) {
      throw new InternalError({ correlationId });
    }
    return parsed.data;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new InternalError({ correlationId });
  }
}

async function executeClaimedOperation(
  store: IdempotencyStore,
  keyHash: string,
  requestHash: string,
  correlationId: string,
  beforeOperation: () => Promise<void>,
  operation: () => Promise<Response>,
): Promise<Response> {
  let response: Response;
  try {
    await beforeOperation();
    response = await operation();
  } catch (error) {
    await releaseClaim(store, keyHash, requestHash, correlationId);
    if (error instanceof Error) {
      throw error;
    }
    throw new InternalError({ correlationId });
  }
  if (response.status < 200 || response.status >= 300) {
    await releaseClaim(store, keyHash, requestHash, correlationId);
    return addCorrelationHeader(response, correlationId);
  }
  try {
    const cachedResponse = await captureResponse(response);
    await store.complete(keyHash, requestHash, cachedResponse);
    return responseFromCache(cachedResponse, correlationId);
  } catch (error) {
    await releaseClaim(store, keyHash, requestHash, correlationId);
    if (error instanceof AppError) {
      throw error;
    }
    throw new InternalError({ correlationId });
  }
}

export async function executeIdempotently(
  store: IdempotencyStore | null,
  key: string,
  scope: IdempotencyScope,
  payload: unknown,
  windowSeconds: number,
  correlationId: string,
  beforeOperation: () => Promise<void>,
  operation: () => Promise<Response>,
): Promise<Response> {
  const parsedInput = executionInputSchema.safeParse({ key, scope, windowSeconds, correlationId });
  if (!parsedInput.success) {
    throw new ValidationError('The idempotency configuration is invalid.', { correlationId });
  }
  if (store === null || typeof beforeOperation !== 'function' || typeof operation !== 'function') {
    throw new InternalError({ correlationId });
  }
  const [keyHash, requestHash] = await Promise.all([
    hashIdempotencyKey(parsedInput.data.key, parsedInput.data.scope),
    hashIdempotencyPayload(payload),
  ]);
  const expiresAt = new Date(Date.now() + parsedInput.data.windowSeconds * 1000).toISOString();
  const claim = await acquireClaim(store, keyHash, requestHash, expiresAt, correlationId);
  if (claim.kind === 'in_progress') {
    throw new IdempotencyReplayError(undefined, { correlationId });
  }
  if (claim.kind === 'replay') {
    if (claim.requestHash !== requestHash) {
      throw new ConflictError('This idempotency key was used with a different request.', {
        correlationId,
      });
    }
    await beforeOperation();
    return responseFromCache(claim.response, correlationId);
  }
  return executeClaimedOperation(
    store,
    keyHash,
    requestHash,
    correlationId,
    beforeOperation,
    operation,
  );
}
