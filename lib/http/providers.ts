// path: lib/http/providers.ts
import type { ActorContext, IpVerdict } from '@/lib/contracts/http';
import type { ApprovalEngine } from '@/lib/contracts/auth';
import type { DbClient } from '@/lib/db/types';

/**
 * Pluggable backend providers for the HTTP pipeline. The foundation ships
 * safe defaults (in-memory rate limiting, no-op persistence); STEP_02 (auth),
 * STEP_12 (network guard) and the integrator register the real engines via
 * these hooks. A pipeline with unregistered providers fails CLOSED for
 * permissions and never blocks on network verdicts it cannot compute.
 */

export type ActorResolver = (request: Request) => Promise<ActorContext>;
export type NetworkGuard = (ip: string, path: string) => Promise<IpVerdict>;

export interface RateLimiter {
  hit(key: string, windowSeconds: number, max: number): Promise<{ allowed: boolean; retryAfterSeconds: number }>;
}

export interface IdempotencyRecord {
  readonly key: string;
  readonly scope: string;
  readonly requestHash: string;
  readonly status: number;
  readonly body: unknown;
}

export interface IdempotencyStore {
  get(scope: string, key: string): Promise<IdempotencyRecord | null>;
  put(record: IdempotencyRecord, ttlSeconds: number): Promise<void>;
}

export type DbProvider = () => Promise<DbClient>;

const anonymousActor: ActorContext = {
  userId: 'anonymous',
  companyId: null,
  role: 'staff',
  subRole: null,
  permissions: new Set<string>(),
  twoFactorVerified: false,
  stepUpVerified: false,
};

const providerState = {
  actorResolver: null as ActorResolver | null,
  networkGuard: null as NetworkGuard | null,
  rateLimiter: null as RateLimiter | null,
  idempotencyStore: null as IdempotencyStore | null,
  approvalEngine: null as ApprovalEngine | null,
  dbProvider: null as DbProvider | null,
};

export function registerActorResolver(resolver: ActorResolver): void {
  providerState.actorResolver = resolver;
}
export function registerNetworkGuard(guard: NetworkGuard): void {
  providerState.networkGuard = guard;
}
export function registerRateLimiter(limiter: RateLimiter): void {
  providerState.rateLimiter = limiter;
}
export function registerIdempotencyStore(store: IdempotencyStore): void {
  providerState.idempotencyStore = store;
}
export function registerApprovalEngine(engine: ApprovalEngine): void {
  providerState.approvalEngine = engine;
}
export function registerDbProvider(provider: DbProvider): void {
  providerState.dbProvider = provider;
}

export const providers = {
  get actorResolver(): ActorResolver {
    return providerState.actorResolver ?? (async () => anonymousActor);
  },
  get networkGuard(): NetworkGuard | null {
    return providerState.networkGuard;
  },
  get rateLimiter(): RateLimiter | null {
    return providerState.rateLimiter;
  },
  get idempotencyStore(): IdempotencyStore | null {
    return providerState.idempotencyStore;
  },
  get approvalEngine(): ApprovalEngine | null {
    return providerState.approvalEngine;
  },
  get dbProvider(): DbProvider | null {
    return providerState.dbProvider;
  },
} as const;
