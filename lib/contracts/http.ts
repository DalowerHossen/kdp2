// path: lib/contracts/http.ts
/**
 * HTTP handler contract (CONTRACTS.md section 4). Every route under app/api goes
 * through defineRoute; reading request.json() directly is forbidden.
 */
import type { ZodType } from 'zod';
import type { RoleName, AdminSubRole, ApprovalLevel } from './auth';

export interface IpVerdict {
  readonly ip: string;
  readonly kind: 'residential' | 'datacenter' | 'vpn' | 'proxy' | 'tor' | 'unknown';
  readonly countryCode: string | null;
  readonly blocked: boolean;
  readonly reason: string | null;
}

export interface ActorContext {
  readonly userId: string;
  readonly companyId: string | null;
  readonly role: RoleName;
  readonly subRole: AdminSubRole | null;
  readonly permissions: ReadonlySet<string>;
  readonly twoFactorVerified: boolean;
  readonly stepUpVerified: boolean;
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
  readonly schema: ZodType<TInput>;
  readonly permission: string;
  readonly rateLimit: { windowSeconds: number; max: number };
  readonly idempotent?: boolean;
  readonly approvalLevel?: ApprovalLevel;
  readonly stepUp?: boolean;
  readonly audit: { action: string; resource: string };
  readonly runtime?: 'nodejs' | 'edge';
}

export type NextHandler = (request: unknown, routeCtx: unknown) => Promise<unknown>;

export interface DefinedRoute {
  GET?: NextHandler;
  POST?: NextHandler;
  PUT?: NextHandler;
  PATCH?: NextHandler;
  DELETE?: NextHandler;
}

export declare function defineRoute<TInput, TOutput>(
  options: RouteOptions<TInput>,
  handler: RouteHandler<TInput, TOutput>,
): DefinedRoute;
