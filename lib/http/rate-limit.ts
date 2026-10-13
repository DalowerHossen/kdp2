// path: lib/http/rate-limit.ts
import { z } from 'zod';
import { AppError } from '@/lib/contracts/errors';
import { InternalError, RateLimitedError, ValidationError } from '@/lib/errors/domain-errors';
import { isoUtcDateTimeSchema } from '@/lib/validation/primitives';

export interface RateLimitRequest {
  readonly key: string;
  readonly windowSeconds: number;
  readonly max: number;
}

export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retryAfterSeconds: number;
  readonly resetAt: string;
}

export interface RateLimitStore {
  /** Atomically consumes an endpoint bucket in shared, durable storage. */
  consume(input: RateLimitRequest): Promise<RateLimitDecision>;
}

export interface EnforceRateLimitInput extends RateLimitRequest {
  readonly correlationId: string;
}

const rateLimitRequestSchema = z
  .object({
    key: z.string().trim().min(1).max(128),
    windowSeconds: z.number().int().min(1).max(86_400),
    max: z.number().int().min(1).max(1_000_000),
  })
  .strict();
const rateLimitDecisionSchema = z
  .object({
    allowed: z.boolean(),
    remaining: z.number().int().min(0),
    retryAfterSeconds: z.number().int().min(0),
    resetAt: isoUtcDateTimeSchema,
  })
  .strict();
const rateLimitKeyInputSchema = z
  .object({
    scope: z.string().trim().min(1).max(512),
    identifiers: z.array(z.string().min(1).max(512)).min(1).max(8),
  })
  .strict();

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

export async function createRateLimitKey(
  scope: string,
  identifiers: readonly string[],
): Promise<string> {
  const parsed = rateLimitKeyInputSchema.safeParse({ scope, identifiers });
  if (!parsed.success) {
    throw new ValidationError('The rate-limit identity is invalid.');
  }
  const normalizedIdentifiers = Array.from(new Set(parsed.data.identifiers)).sort();
  return sha256(JSON.stringify([parsed.data.scope, normalizedIdentifiers]));
}

export async function enforceRateLimit(
  store: RateLimitStore | null,
  input: EnforceRateLimitInput,
): Promise<RateLimitDecision> {
  const parsedInput = rateLimitRequestSchema.safeParse({
    key: input.key,
    windowSeconds: input.windowSeconds,
    max: input.max,
  });
  if (!parsedInput.success) {
    throw new ValidationError('The rate-limit configuration is invalid.', {
      correlationId: input.correlationId,
    });
  }
  if (store === null) {
    throw new InternalError({ correlationId: input.correlationId });
  }

  try {
    const parsedDecision = rateLimitDecisionSchema.safeParse(await store.consume(parsedInput.data));
    if (
      !parsedDecision.success ||
      parsedDecision.data.remaining > parsedInput.data.max ||
      parsedDecision.data.retryAfterSeconds > parsedInput.data.windowSeconds
    ) {
      throw new InternalError({ correlationId: input.correlationId });
    }
    if (!parsedDecision.data.allowed) {
      throw new RateLimitedError(undefined, { correlationId: input.correlationId });
    }
    return parsedDecision.data;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new InternalError({ correlationId: input.correlationId });
  }
}
