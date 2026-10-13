// path: lib/http/define-route.ts
import { z } from 'zod';
import type { ActorContext } from '@/lib/contracts/auth';
import { AppError, type ErrorCode } from '@/lib/contracts/errors';
import type {
  DefineRoute,
  IpVerdict,
  NextHandler,
  RequestContext,
  RouteMethod,
  RouteMethods,
  RouteOptions,
  RouteHandler,
} from '@/lib/contracts/http';
import { InternalError, ValidationError, ForbiddenError } from '@/lib/errors/domain-errors';
import { mapErrorToResponse } from '@/lib/errors/error-response';
import { addCorrelationHeader, getRequestCorrelationId } from '@/lib/http/correlation';
import { assertCsrfRequest } from '@/lib/http/csrf';
import {
  DEFAULT_IDEMPOTENCY_WINDOW_SECONDS,
  executeIdempotently,
  readIdempotencyKey,
} from '@/lib/http/idempotency';
import {
  createRateLimitKey,
  enforceRateLimit,
  type RateLimitDecision,
} from '@/lib/http/rate-limit';
import type { LogFields } from '@/lib/contracts/logger';
import { companyIdSchema } from '@/lib/validation/primitives';
import { parseRouteInput, readRouteInput } from '@/lib/http/request-body';

import { getRouteRuntime, type RouteRuntime } from '@/lib/http/runtime';
export { configureRouteRuntime } from '@/lib/http/runtime';

interface RequestState {
  context: RequestContext | null;
}

const ROLE_NAMES = ['super_admin', 'ceo', 'admin_staff', 'owner', 'staff'] as const;
const ADMIN_SUB_ROLES = [
  'kyc_reviewer',
  'payment_processor',
  'support_agent',
  'content_manager',
  'compliance_officer',
  'fraud_analyst',
  'finance_analyst',
] as const;
const actorContextSchema = z
  .object({
    userId: z.string().trim().min(1).max(255),
    companyId: companyIdSchema.nullable(),
    role: z.enum(ROLE_NAMES),
    subRole: z.enum(ADMIN_SUB_ROLES).nullable(),
    permissions: z.set(z.string().trim().min(1).max(160)).max(10_000),
    twoFactorVerified: z.boolean(),
    stepUpVerified: z.boolean(),
  })
  .strict();
const ipVerdictSchema = z
  .object({
    allowed: z.boolean(),
    riskScore: z.number().finite().min(0),
  })
  .strict();
const routeDefinitionSchema = z
  .object({
    permission: z
      .string()
      .trim()
      .min(1)
      .max(128)
      .regex(/^[a-z][a-z0-9_.:-]*$/i),
    rateLimit: z
      .object({
        windowSeconds: z.number().int().min(1).max(86_400),
        max: z.number().int().min(1).max(1_000_000),
      })
      .strict(),
    audit: z
      .object({
        action: z.string().trim().min(1).max(128),
        resource: z.string().trim().min(1).max(128),
      })
      .strict(),
  })
  .strict();
const ROUTE_METHODS = new Set<RouteMethod>(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

function validateMethods(methods: readonly RouteMethod[]): void {
  if (methods.length === 0 || new Set(methods).size !== methods.length) {
    throw new ValidationError('A route must define unique HTTP methods.');
  }
  if (methods.some((method) => !ROUTE_METHODS.has(method))) {
    throw new ValidationError('The route contains an unsupported HTTP method.');
  }
}

function validateRouteOptions<TInput>(options: RouteOptions<TInput>): readonly RouteMethod[] {
  const methods = options.methods ?? ['GET'];
  validateMethods(methods);
  if (options.idempotent === true && methods.includes('GET')) {
    throw new ValidationError('Idempotency can only be configured for mutation methods.');
  }
  const definition = routeDefinitionSchema.safeParse({
    permission: options.permission,
    rateLimit: options.rateLimit,
    audit: options.audit,
  });
  if (
    !definition.success ||
    definition.data.permission !== options.permission ||
    definition.data.audit.action !== options.audit.action ||
    definition.data.audit.resource !== options.audit.resource
  ) {
    throw new ValidationError('The route configuration is invalid.');
  }
  return methods;
}

function jsonResponse(value: unknown, status: number, correlationId: string): Response {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new InternalError({ correlationId });
  }
  return addCorrelationHeader(
    new Response(serialized, {
      status,
      headers: {
        'cache-control': 'no-store',
        'content-type': 'application/json; charset=utf-8',
      },
    }),
    correlationId,
  );
}

function errorResponse(error: unknown, correlationId: string): Response {
  const mapped = mapErrorToResponse(error, correlationId);
  return jsonResponse(mapped.body, mapped.status, correlationId);
}

function outputResponse<TOutput>(output: TOutput, correlationId: string): Response {
  if (output === undefined) {
    return addCorrelationHeader(
      new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } }),
      correlationId,
    );
  }
  if (!(output instanceof Response)) {
    return jsonResponse(output, 200, correlationId);
  }
  const headers = new Headers(output.headers);
  headers.set('cache-control', 'no-store');
  return addCorrelationHeader(
    new Response(output.body, {
      status: output.status,
      statusText: output.statusText,
      headers,
    }),
    correlationId,
  );
}

function validateIpVerdict(value: IpVerdict, correlationId: string): IpVerdict {
  const parsed = ipVerdictSchema.safeParse(value);
  if (!parsed.success) {
    throw new InternalError({ correlationId });
  }
  if (!parsed.data.allowed) {
    throw new ForbiddenError('This request is not allowed from the current network.', {
      correlationId,
    });
  }
  return parsed.data;
}

function validateActor(value: ActorContext, correlationId: string): ActorContext {
  const parsed = actorContextSchema.safeParse(value);
  if (!parsed.success) {
    throw new InternalError({ correlationId });
  }
  return parsed.data;
}

function validateTenantId(
  value: string | null,
  actor: ActorContext,
  correlationId: string,
): string | null {
  if (value === null) {
    if (actor.companyId !== null) {
      throw new InternalError({ correlationId });
    }
    return null;
  }
  const parsed = companyIdSchema.safeParse(value);
  if (!parsed.success || actor.companyId !== value) {
    throw new InternalError({ correlationId });
  }
  return parsed.data;
}

async function createRouteContext(
  request: Request,
  options: RouteOptions<unknown>,
  runtime: RouteRuntime,
  correlationId: string,
  startedAt: number,
): Promise<RequestContext> {
  const ip = validateIpVerdict(await runtime.networkGuard(request), correlationId);
  assertCsrfRequest(request, correlationId);
  const actor = validateActor(await runtime.authenticate(request), correlationId);
  if (!actor.permissions.has(options.permission)) {
    throw new ForbiddenError('You do not have permission to perform this action.', {
      correlationId,
    });
  }
  const tenantId = validateTenantId(
    await runtime.resolveTenantId(actor, request),
    actor,
    correlationId,
  );
  return Object.freeze({ correlationId, actor, tenantId, ip, startedAt });
}

async function applyRouteRateLimit(
  request: Request,
  method: RouteMethod,
  options: RouteOptions<unknown>,
  runtime: RouteRuntime,
  context: RequestContext,
): Promise<RateLimitDecision> {
  const identifiers = await runtime.rateLimitIdentifiers(
    request,
    context.actor,
    options.audit.resource,
  );
  const rateLimitKey = await createRateLimitKey(
    `${method}:${options.audit.action}:${options.audit.resource}`,
    identifiers,
  );
  return enforceRateLimit(runtime.rateLimitStore, {
    key: rateLimitKey,
    windowSeconds: options.rateLimit.windowSeconds,
    max: options.rateLimit.max,
    correlationId: context.correlationId,
  });
}

function buildActionAuthorization<TInput>(
  actor: ActorContext,
  options: RouteOptions<TInput>,
  runtime: RouteRuntime,
  context: RequestContext,
): () => Promise<void> {
  return async (): Promise<void> => {
    if (options.stepUp === true && !actor.stepUpVerified) {
      throw new ForbiddenError('Step-up verification is required.', {
        correlationId: context.correlationId,
      });
    }
    if (options.approvalLevel !== undefined) {
      await runtime.checkApproval(options.approvalLevel, options.audit.action, context);
    }
  };
}

async function executeAction<TInput, TOutput>(
  request: Request,
  input: TInput,
  context: RequestContext,
  options: RouteOptions<TInput>,
  runtime: RouteRuntime,
  handler: RouteHandler<TInput, TOutput>,
): Promise<Response> {
  const authorize = buildActionAuthorization(context.actor, options, runtime, context);
  const operation = async (): Promise<Response> =>
    outputResponse(await handler(input, context), context.correlationId);
  if (options.idempotent === true) {
    const idempotencyScope = [
      context.tenantId === null ? 'user' : 'tenant',
      context.tenantId ?? context.actor.userId,
      options.audit.action,
      options.audit.resource,
    ] as const;
    return executeIdempotently(
      runtime.idempotencyStore,
      readIdempotencyKey(request),
      idempotencyScope,
      input,
      DEFAULT_IDEMPOTENCY_WINDOW_SECONDS,
      context.correlationId,
      authorize,
      operation,
    );
  }
  await authorize();
  return operation();
}

function addRateLimitHeaders(
  response: Response,
  max: number,
  remaining: number,
  resetAt: string,
  correlationId: string,
): Response {
  const headers = new Headers(response.headers);
  headers.set('x-ratelimit-limit', String(max));
  headers.set('x-ratelimit-remaining', String(remaining));
  headers.set('x-ratelimit-reset', resetAt);
  return addCorrelationHeader(
    new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    }),
    correlationId,
  );
}

function routeLogFields<TInput>(
  context: RequestContext | null,
  options: RouteOptions<TInput>,
  correlationId: string,
  startedAt: number,
  errorCode: ErrorCode,
): LogFields {
  return {
    correlation_id: correlationId,
    user_id: context?.actor.userId ?? null,
    company_id: context?.tenantId ?? null,
    route: options.audit.resource,
    duration_ms: Math.max(0, performance.now() - startedAt),
    error_code: errorCode,
  };
}

async function reportFailure<TInput>(
  runtime: RouteRuntime,
  options: RouteOptions<TInput>,
  state: RequestState,
  correlationId: string,
  startedAt: number,
  error: unknown,
): Promise<void> {
  const errorCode: ErrorCode = error instanceof AppError ? error.code : 'internal';
  if (state.context !== null) {
    try {
      await runtime.writeAudit(
        {
          action: options.audit.action,
          resource: options.audit.resource,
          outcome: 'failure',
          errorCode,
        },
        state.context,
      );
    } catch {
      runtime.logError(
        'Route failure audit could not be recorded.',
        routeLogFields(state.context, options, correlationId, startedAt, 'internal'),
      );
    }
  }
  runtime.logError(
    'API route failed.',
    routeLogFields(state.context, options, correlationId, startedAt, errorCode),
  );
}

async function executeRoute<TInput, TOutput>(
  request: Request,
  method: RouteMethod,
  options: RouteOptions<TInput>,
  handler: RouteHandler<TInput, TOutput>,
  runtime: RouteRuntime,
  state: RequestState,
  correlationId: string,
  startedAt: number,
): Promise<Response> {
  const context = await createRouteContext(request, options, runtime, correlationId, startedAt);
  state.context = context;
  const rateLimit = await applyRouteRateLimit(request, method, options, runtime, context);
  const rawInput = await readRouteInput(request, method, correlationId);
  const parsedInput = parseRouteInput(options.schema, rawInput, correlationId);
  const input = await runtime.sanitizeInput(parsedInput, context);
  const response = await executeAction(request, input, context, options, runtime, handler);
  await runtime.writeAudit(
    {
      action: options.audit.action,
      resource: options.audit.resource,
      outcome: response.status >= 400 ? 'failure' : 'success',
    },
    context,
  );
  return addRateLimitHeaders(
    response,
    options.rateLimit.max,
    rateLimit.remaining,
    rateLimit.resetAt,
    correlationId,
  );
}

async function dispatchRequest<TInput, TOutput>(
  request: Request,
  method: RouteMethod,
  options: RouteOptions<TInput>,
  handler: RouteHandler<TInput, TOutput>,
  runtime: RouteRuntime,
  correlationId: string,
  startedAt: number,
): Promise<Response> {
  const state: RequestState = { context: null };
  try {
    if (request.method.toUpperCase() !== method) {
      return addCorrelationHeader(
        new Response(null, { status: 405, headers: { allow: method } }),
        correlationId,
      );
    }
    return await executeRoute(
      request,
      method,
      options,
      handler,
      runtime,
      state,
      correlationId,
      startedAt,
    );
  } catch (error) {
    await reportFailure(runtime, options, state, correlationId, startedAt, error);
    return errorResponse(error, correlationId);
  }
}

function buildHandler<TInput, TOutput>(
  method: RouteMethod,
  options: RouteOptions<TInput>,
  handler: RouteHandler<TInput, TOutput>,
): NextHandler {
  return async (request: Request): Promise<Response> => {
    const correlationId = getRequestCorrelationId(request);
    const startedAt = performance.now();
    const runtime = getRouteRuntime();
    if (runtime === null) {
      return errorResponse(new InternalError({ correlationId }), correlationId);
    }
    try {
      return await runtime.withCorrelation(correlationId, () =>
        dispatchRequest(request, method, options, handler, runtime, correlationId, startedAt),
      );
    } catch (error) {
      runtime.logError(
        'API route runtime failed.',
        routeLogFields(null, options, correlationId, startedAt, 'internal'),
      );
      return errorResponse(error, correlationId);
    }
  };
}

export const defineRoute: DefineRoute = <TInput, TOutput>(
  options: RouteOptions<TInput>,
  handler: RouteHandler<TInput, TOutput>,
): RouteMethods => {
  const methods = validateRouteOptions(options);
  const frozenOptions = Object.freeze({
    ...options,
    methods: Object.freeze([...methods]),
    rateLimit: Object.freeze({ ...options.rateLimit }),
    audit: Object.freeze({ ...options.audit }),
  });
  const routeMethods: RouteMethods = {
    ...(methods.includes('GET') ? { GET: buildHandler('GET', frozenOptions, handler) } : {}),
    ...(methods.includes('POST') ? { POST: buildHandler('POST', frozenOptions, handler) } : {}),
    ...(methods.includes('PUT') ? { PUT: buildHandler('PUT', frozenOptions, handler) } : {}),
    ...(methods.includes('PATCH') ? { PATCH: buildHandler('PATCH', frozenOptions, handler) } : {}),
    ...(methods.includes('DELETE')
      ? { DELETE: buildHandler('DELETE', frozenOptions, handler) }
      : {}),
  };
  return Object.freeze(routeMethods);
};
