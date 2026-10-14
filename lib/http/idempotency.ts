// path: lib/http/idempotency.ts
import type { DbClient } from '@/lib/db/types';
import type { IdempotencyRecord, IdempotencyStore } from './providers';
import { createHash } from 'node:crypto';

/**
 * Idempotency (CONTRACTS.md section 4, X16). A key unique per tenant replays
 * the ORIGINAL response and never executes the handler twice. Reusing the key
 * with a different payload is a hard conflict.
 */

export function hashRequestPayload(payload: unknown): string {
  const canonical = stableStringify(payload);
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
  return `{${entries.join(',')}}`;
}

export class MemoryIdempotencyStore implements IdempotencyStore {
  private readonly store = new Map<string, { record: IdempotencyRecord; expiresAt: number }>();

  async get(scope: string, key: string): Promise<IdempotencyRecord | null> {
    const entry = this.store.get(`${scope}:${key}`);
    if (entry === undefined) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(`${scope}:${key}`);
      return null;
    }
    return entry.record;
  }

  async put(record: IdempotencyRecord, ttlSeconds: number): Promise<void> {
    this.store.set(`${record.scope}:${record.key}`, {
      record,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }
}

export class DbIdempotencyStore implements IdempotencyStore {
  constructor(
    private readonly db: DbClient,
    private readonly companyId: string | null,
  ) {}

  async get(scope: string, key: string): Promise<IdempotencyRecord | null> {
    const res = await this.db.query<{
      request_hash: string;
      response_status: number;
      response_body: unknown;
    }>(
      `select request_hash, response_status, response_body
       from idempotency_keys
       where company_id is not distinct from $1::uuid
         and scope = $2
         and idem_key = $3
         and deleted_at is null
         and expires_at > now()`,
      [this.companyId, scope, key],
    );
    const row = res.rows[0];
    if (row === undefined) return null;
    return {
      key,
      scope,
      requestHash: row.request_hash,
      status: row.response_status,
      body: row.response_body,
    };
  }

  async put(record: IdempotencyRecord, ttlSeconds: number): Promise<void> {
    await this.db.query(
      `insert into idempotency_keys
         (company_id, scope, idem_key, request_hash, response_status, response_body, expires_at)
       values ($1::uuid, $2, $3, $4, $5, $6::jsonb, now() + ($7 || ' seconds')::interval)
       on conflict do nothing`,
      [
        this.companyId,
        record.scope,
        record.key,
        record.requestHash,
        record.status,
        JSON.stringify(record.body ?? null),
        String(ttlSeconds),
      ],
    );
  }
}
