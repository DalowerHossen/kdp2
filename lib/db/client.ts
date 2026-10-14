// path: lib/db/client.ts
import type { DbClient, QueryResult } from './types';
import { createLogger } from '@/lib/logger';

/**
 * Server-side Postgres client (node runtime only). Uses the direct connection
 * string from DATABASE_URL (Supabase session pooler). Never import this module
 * from edge or browser code; those paths use lib/supabase/* clients.
 */

const log = createLogger({ module: 'lib/db' });

const DEFAULT_STATEMENT_TIMEOUT_MS = 30_000;

let pool: import('pg').Pool | null = null;

async function loadPg(): Promise<typeof import('pg')> {
  return import('pg');
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === '') {
    throw new Error('DATABASE_URL is not configured.');
  }
  return url;
}

export async function getPool(): Promise<import('pg').Pool> {
  if (pool !== null) return pool;
  const { Pool } = await loadPg();
  pool = new Pool({
    connectionString: getDatabaseUrl(),
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    statement_timeout: DEFAULT_STATEMENT_TIMEOUT_MS,
    application_name: 'kd-app',
  });
  pool.on('error', (err) => {
    log.error('pg pool error', { reason: err.message });
  });
  return pool;
}

class PgDbClient implements DbClient {
  constructor(private readonly conn: { query: (text: string, params?: readonly unknown[]) => Promise<{ rows: unknown[]; rowCount: number | null }> }) {}

  async query<Row>(text: string, params: readonly unknown[] = []): Promise<QueryResult<Row>> {
    const started = Date.now();
    const res = await this.conn.query(text, params);
    log.debug('db.query', { duration_ms: Date.now() - started, rows: res.rowCount ?? 0 });
    return { rows: res.rows as Row[], rowCount: res.rowCount ?? res.rows.length };
  }

  async withTransaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
    const realPool = await getPool();
    const client = await realPool.connect();
    const txClient = new PgDbClient(client);
    try {
      await client.query('begin');
      const result = await fn(txClient);
      await client.query('commit');
      return result;
    } catch (err) {
      await client.query('rollback').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  async end(): Promise<void> {
    // Per-request clients are released by withTransaction; the shared pool
    // outlives requests by design.
  }
}

let shared: DbClient | null = null;

export async function getDb(): Promise<DbClient> {
  if (shared !== null) return shared;
  const realPool = await getPool();
  shared = new PgDbClient(realPool);
  return shared;
}

export async function shutdownDb(): Promise<void> {
  if (pool !== null) {
    await pool.end();
    pool = null;
    shared = null;
  }
}
