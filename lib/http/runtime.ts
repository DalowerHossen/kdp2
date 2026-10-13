// path: lib/http/runtime.ts
import type { ActorContext, ApprovalLevel } from '@/lib/contracts/auth';
import type { ErrorCode } from '@/lib/contracts/errors';
import type { IpVerdict, RequestContext } from '@/lib/contracts/http';
import type { LogFields } from '@/lib/contracts/logger';
import { InternalError } from '@/lib/errors/domain-errors';
import type { IdempotencyStore } from '@/lib/http/idempotency';
import type { RateLimitStore } from '@/lib/http/rate-limit';

export interface RouteAuditEvent {
  readonly action: string;
  readonly resource: string;
  readonly outcome: 'success' | 'failure';
  readonly errorCode?: ErrorCode;
}

export interface RouteRuntime {
  networkGuard(request: Request): Promise<IpVerdict>;
  authenticate(request: Request): Promise<ActorContext>;
  resolveTenantId(actor: ActorContext, request: Request): Promise<string | null>;
  rateLimitIdentifiers(
    request: Request,
    actor: ActorContext,
    route: string,
  ): Promise<readonly string[]>;
  sanitizeInput<TInput>(input: TInput, context: RequestContext): Promise<TInput>;
  checkApproval(level: ApprovalLevel, action: string, context: RequestContext): Promise<void>;
  writeAudit(event: RouteAuditEvent, context: RequestContext): Promise<void>;
  withCorrelation<TValue>(correlationId: string, operation: () => TValue): TValue;
  logError(message: string, fields: LogFields): void;
  readonly rateLimitStore: RateLimitStore;
  readonly idempotencyStore: IdempotencyStore | null;
}

let configuredRuntime: RouteRuntime | null = null;

export function configureRouteRuntime(runtime: RouteRuntime): void {
  if (
    typeof runtime.networkGuard !== 'function' ||
    typeof runtime.authenticate !== 'function' ||
    typeof runtime.resolveTenantId !== 'function' ||
    typeof runtime.rateLimitIdentifiers !== 'function' ||
    typeof runtime.sanitizeInput !== 'function' ||
    typeof runtime.checkApproval !== 'function' ||
    typeof runtime.writeAudit !== 'function' ||
    typeof runtime.withCorrelation !== 'function' ||
    typeof runtime.logError !== 'function' ||
    typeof runtime.rateLimitStore?.consume !== 'function' ||
    (runtime.idempotencyStore !== null &&
      (typeof runtime.idempotencyStore?.claim !== 'function' ||
        typeof runtime.idempotencyStore.complete !== 'function' ||
        typeof runtime.idempotencyStore.release !== 'function'))
  ) {
    throw new InternalError();
  }
  if (configuredRuntime !== null && configuredRuntime !== runtime) {
    throw new InternalError();
  }
  configuredRuntime = Object.freeze(runtime);
}

export function getRouteRuntime(): RouteRuntime | null {
  return configuredRuntime;
}
