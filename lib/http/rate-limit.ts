// path: lib/http/rate-limit.ts
import type { DbClient } from '@/lib/db/types';
import type { RateLimiter } from './providers';

/**
 * Rate limiting (CONTRACTS.md section 4, feature 443 class). Two
 * implementations: an in-memory limiter (single-process dev) and a durable
 * limiter on the rate_limit_buckets table (production; survives restarts,
 * per ADDENDUM P-05 the same durability rule as login locks).
 */

interface Bucket {
  windowStart: number;
  count: number;
}

export class MemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  async hit(
    key: string,
    windowSeconds: number,
    max: number,
  ): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const current = this.buckets.get(key);

    if (current === undefined || now - current.windowStart >= windowMs) {
      this.buckets.set(key, { windowStart: now, count: 1 });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    if (current.count < max) {
      current.count += 1;
      return { allowed: true, retryAfterSeconds: 0 };
    }
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((current.windowStart + windowMs - now) / 1000),
    };
  }
}

export class DbRateLimiter implements RateLimiter {
  constructor(private readonly db: DbClient) {}

  async hit(
    key: string,
    windowSeconds: number,
    max: number,
  ): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
    const windowStart = new Date(Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000).toISOString();
    const res = await this.db.query<{ count: number }>(
      `insert into rate_limit_buckets (company_id, bucket_key, window_start, hit_count)
       values (null, $1, $2::timestamptz, 1)
       on conflict (bucket_key, window_start) where deleted_at is null
       do update set hit_count = rate_limit_buckets.hit_count + 1
       returning hit_count as count`,
      [key, windowStart],
    );
    const count = res.rows[0]?.count ?? 1;
    if (count <= max) return { allowed: true, retryAfterSeconds: 0 };
    const windowEnd = new Date(windowStart).getTime() + windowSeconds * 1000;
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((windowEnd - Date.now()) / 1000)) };
  }
}
