// path: lib/contracts/http.ts
import type { ZodType } from 'zod';
import type { ActorContext, ApprovalLevel } from '@/lib/contracts/auth';

export type RouteMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface IpVerdict {
  readonly allowed: boolean;
  readonly riskScore: number;
}

export interface RequestContext {
  readonly correlationId: string;
  readonly actor: ActorContext;
  readonly tenantId: string | null;
  readonly ip: IpVerdict;
  readonly startedAt: number;
}

export type RouteHandler<TInput, TOutput> = (
  input: TInput,
  ctx: RequestContext,
) => Promise<TOutput>;

export interface RouteOptions<TInput> {
  readonly methods?: readonly RouteMethod[];
  readonly schema: ZodType<TInput>;
  readonly permission: string;
  readonly rateLimit: { readonly windowSeconds: number; readonly max: number };
  readonly idempotent?: boolean;
  readonly approvalLevel?: ApprovalLevel;
  readonly stepUp?: boolean;
  readonly audit: { readonly action: string; readonly resource: string };
  readonly runtime?: 'nodejs' | 'edge';
}

export interface RouteContext {
  readonly params?: Readonly<Record<string, string | string[]>>;
}

export type NextHandler = (
  request: Request,
  context?: RouteContext,
) => Response | Promise<Response>;

export interface RouteMethods {
  readonly GET?: NextHandler;
  readonly POST?: NextHandler;
  readonly PUT?: NextHandler;
  readonly PATCH?: NextHandler;
  readonly DELETE?: NextHandler;
}

export interface DefineRoute {
  <TInput, TOutput>(
    options: RouteOptions<TInput>,
    handler: RouteHandler<TInput, TOutput>,
  ): RouteMethods;
}
