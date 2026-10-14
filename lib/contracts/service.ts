// path: lib/contracts/service.ts
/**
 * Service mutation contract (CONTRACTS.md section 5). defineMutation guarantees
 * an audit row on success and on failure, an idempotency record when a key is
 * supplied, a version check and increment when optimistic locking is on, and a
 * DuplicateError when duplicateCheck returns a hash that already exists.
 */
import type { RequestContext } from './http';

// TOutput is carried by defineMutation, not by the options bag (kept off the
// interface to satisfy noUnusedLocals; CONTRACTS.md's pseudo-signature is
// unchanged in behavior).
export interface MutationOptions<TInput> {
  readonly action: string;
  readonly resource: string;
  readonly table: string;
  readonly idempotencyKey?: (input: TInput, ctx: RequestContext) => string;
  readonly optimisticLock?: boolean; // default true
  readonly approvalLevel?: 1 | 2 | 3;
  readonly duplicateCheck?: (input: TInput, ctx: RequestContext) => Promise<string | null>;
}

export declare function defineMutation<TInput, TOutput>(
  options: MutationOptions<TInput>,
  body: (input: TInput, ctx: RequestContext) => Promise<TOutput>,
): (input: TInput, ctx: RequestContext) => Promise<TOutput>;
