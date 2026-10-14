// path: lib/http/define-route.ts
import type {
  ActorContext,
  DefinedRoute,
  IpVerdict,
  NextHandler,
  RequestContext,
  RouteHandler,
  RouteOptions,
} from '@/lib/contracts/http';
import {
  ApprovalRequiredError,
  AppError,
  ForbiddenError,
  RateLimitedError,
  UnauthorizedError,
  IdempotencyReplayError,
} from '@/lib/errors';
import { toAppError, toApiErrorBody } from '@/lib/errors/map';
import { createLogger } from '@/lib/logger';
import { resolveCorrelationId, CORRELATION_HEADER } from '@/lib/logger/correlation';
import { IDEMPOTENCY_HEADER } from '@/config/constants';
import { deepSanitize } from '@/lib/validation/sanitize';
import { providers, type RateLimiter, type IdempotencyStore } from './providers';
import { MemoryRateLimiter } from './rate-limit';
import { MemoryIdempotencyStore, hashRequestPayload } from './idempotency';
import { extractClientIp, defaultIpVerdict } from './network-guard';
import { verifyCsrf } from './csrf';

/**
 * defineRoute (CONTRACTS.md section 4). Applies, in order:
 *   correlation ID, network guard, auth, permission check, rate limit,
 *   Zod parse + sanitization, CSRF, step-up check, approval requirement,
 *   idempotency replay, the handler, and error mapping.
 *
 * A route handler written by any step MUST go through defineRoute. Reading
 * request.json() directly is forbidden.
 */

const log = createLogger({ module: 'lib/http' });

let fallbackLimiter: RateLimiter | null = null;
let fallbackIdempotency: IdempotencyStore | null = null;

function getLimiter(): RateLimiter {
  fallbackLimiter ??= new MemoryRateLimiter();
  return providers.rateLimiter ?? fallbackLimiter;
}

function getIdempotencyStore(): IdempotencyStore {
  fallbackIdempotency ??= new MemoryIdempotencyStore();
  return providers.idempotencyStore ?? fallbackIdempotency;
}

function json(body: unknown, status: number, correlationId: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      [CORRELATION_HEADER]: correlationId,
      'cache-control': 'no-store',
    },
  });
}

function checkPermission(actor: ActorContext, required: string): void {
  if (required === 'public') return;
  if (actor.userId === 'anonymous') {
    throw new UnauthorizedError();
  }
  if (!actor.permissions.has(required) && !actor.permissions.has('*')) {
    throw new ForbiddenError();
  }
}

function checkStepUp(actor: ActorContext, required: boolean | undefined): void {
  if (required === true && !actor.stepUpVerified) {
    throw new ForbiddenError('Step-up authentication is required for this action.');
  }
}

function checkApproval(actor: ActorContext, options: RouteOptions<unknown>): void {
  const engine = providers.approvalEngine;
  const authority = actor.role === 'super_admin' ? 3 : actor.role === 'ceo' ? 2 : 1;
  const engineLevel = engine !== null ? engine.levelFor(options.audit.action, actor) : 1;
  const required = options.approvalLevel ?? engineLevel;
  if (required > authority) {
    throw new ApprovalRequiredError();
  }
}

interface RouteParams {
  params?: Record<string, string>;
}

async function buildInput<TInput>(
  options: RouteOptions<TInput>,
  request: Request,
  method: string,
  routeCtx: RouteParams,
): Promise<TInput> {
  let raw: unknown = {};
  if (method !== 'GET' && method !== 'HEAD') {
    const text = await request.text();
    if (text !== '') {
      try {
        raw = JSON.parse(text) as unknown;
      } catch {
        throw new AppError('validation_failed', 'Request body must be valid JSON.');
      }
    }
  } else {
    const url = new URL(request.url);
    const query: Record<string, string> = {};
    url.searchParams.forEach((v, k) => {
      query[k] = v;
    });
    raw = query;
  }

  const withParams =
    typeof raw === 'object' && raw !== null && !Array.isArray(raw)
      ? { ...(raw as Record<string, unknown>), ...(routeCtx.params ?? {}) }
      : raw;

  const parsed = options.schema.safeParse(withParams);
  if (!parsed.success) {
    throw toAppError(parsed.error, 'request');
  }
  return deepSanitize(parsed.data as TInput);
}

function toHttpRoute(ctx: { params?: Record<string, string> } | undefined): RouteParams {
  return ctx ?? {};
}

export function defineRoute<TInput, TOutput>(
  options: RouteOptions<TInput>,
  handler: RouteHandler<TInput, TOutput>,
): DefinedRoute {
  const make = (method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'): NextHandler => {
    const wrapped = async (rawRequest: unknown, rawCtx: unknown): Promise<unknown> => {
      const request = rawRequest as Request;
      const routeCtx = toHttpRoute(rawCtx as { params?: Record<string, string> } | undefined);
      const startedAt = Date.now();
      const correlationId = resolveCorrelationId(request.headers.get(CORRELATION_HEADER));
      const url = new URL(request.url);
      const path = url.pathname;
      const routeLog = log.child({
        correlation_id: correlationId,
        route: `${method} ${path}`,
      });

      try {
        const actor: ActorContext = await providers.actorResolver(request);
        const guard = providers.networkGuard;
        const ipVerdict: IpVerdict =
          guard !== null ? await guard(extractClientIp(request), path) : defaultIpVerdict(extractClientIp(request));

        if (ipVerdict.blocked) {
          throw new ForbiddenError('Access from this network is not permitted.');
        }

        checkPermission(actor, options.permission);

        const rateVerdict = await getLimiter().hit(
          `${path}:${ipVerdict.ip}`,
          options.rateLimit.windowSeconds,
          options.rateLimit.max,
        );
        if (!rateVerdict.allowed) {
          throw new RateLimitedError();
        }

        if (!verifyCsrf(request, method)) {
          throw new ForbiddenError('CSRF token is missing or invalid.');
        }

        checkStepUp(actor, options.stepUp);
        checkApproval(actor, options as RouteOptions<unknown>);

        const input = await buildInput(options, request, method, routeCtx);

        const ctx: RequestContext = {
          correlationId,
          actor,
          tenantId: actor.companyId,
          ip: ipVerdict,
          startedAt,
        };

        // Idempotency: a replayed key returns the ORIGINAL response and never
        // executes the handler twice; the same key with another payload is a
        // hard conflict.
        let idemKey: string | null = null;
        let requestHash = '';
        const idemScope = `${method} ${path}`;
        if (options.idempotent === true) {
          idemKey = request.headers.get(IDEMPOTENCY_HEADER);
          if (idemKey === null || idemKey.length < 8 || idemKey.length > 200) {
            throw new AppError(
              'validation_failed',
              `Header ${IDEMPOTENCY_HEADER} is required (8-200 characters).`,
            );
          }
          requestHash = hashRequestPayload(input);
          const existing = await getIdempotencyStore().get(idemScope, idemKey);
          if (existing !== null) {
            if (existing.requestHash !== requestHash) {
              throw new IdempotencyReplayError();
            }
            return json(
              { data: existing.body, idempotent_replay: true },
              existing.status,
              correlationId,
            );
          }
        }

        const output = await handler(input, ctx);
        const status = 200;

        if (options.idempotent === true && idemKey !== null) {
          await getIdempotencyStore().put(
            { key: idemKey, scope: idemScope, requestHash, status, body: output ?? null },
            24 * 3600,
          );
        }

        routeLog.info('request.completed', {
          duration_ms: Date.now() - startedAt,
          actor_id: actor.userId,
          company_id: actor.companyId,
        });

        return json({ data: output ?? null }, status, correlationId);
      } catch (err) {
        const appErr = toAppError(err, correlationId);
        const body = toApiErrorBody(appErr, correlationId);
        routeLog.warn('request.failed', {
          duration_ms: Date.now() - startedAt,
          code: appErr.code,
          status: appErr.status,
        });
        if (appErr.status >= 500) {
          routeLog.error('request.error', {
            reason: err instanceof Error ? err.message : 'unknown',
          });
        }
        const response = json(body, appErr.status, correlationId);
        if (appErr.status === 429) {
          response.headers.set('retry-after', '30');
        }
        return response;
      }
    };
    return wrapped;
  };

  return {
    GET: make('GET'),
    POST: make('POST'),
    PUT: make('PUT'),
    PATCH: make('PATCH'),
    DELETE: make('DELETE'),
  };
}
