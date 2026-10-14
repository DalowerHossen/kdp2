// path: lib/contracts/service.ts
import type { RequestContext } from '@/lib/contracts/http';

declare const MUTATION_OUTPUT_TYPE: unique symbol;

export interface MutationOptions<TInput, TOutput> {
  readonly action: string;
  readonly resource: string;
  readonly table: string;
  readonly idempotencyKey?: (input: TInput, ctx: RequestContext) => string;
  readonly optimisticLock?: boolean;
  readonly approvalLevel?: 1 | 2 | 3;
  readonly duplicateCheck?: (input: TInput, ctx: RequestContext) => Promise<string | null>;
  readonly [MUTATION_OUTPUT_TYPE]?: TOutput;
}

export type MutationBody<TInput, TOutput> = (
  input: TInput,
  ctx: RequestContext,
) => Promise<TOutput>;

export type MutationHandler<TInput, TOutput> = (
  input: TInput,
  ctx: RequestContext,
) => Promise<TOutput>;

export interface DefineMutation {
  <TInput, TOutput>(
    options: MutationOptions<TInput, TOutput>,
    body: MutationBody<TInput, TOutput>,
  ): MutationHandler<TInput, TOutput>;
}
