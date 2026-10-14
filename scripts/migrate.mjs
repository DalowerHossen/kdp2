#!/usr/bin/env node
// path: scripts/migrate.mjs
// Ordered, idempotent migration runner with a checksum ledger.
// Usage: node scripts/migrate.mjs up
// Target: DATABASE_URL (pg, production/Supabase) when set, otherwise PGlite.
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

export function listUpMigrations() {
  return readdirSync('migrations')
    .filter((f) => /^\d{4}_.*\.sql$/.test(f) && !f.endsWith('_down.sql'))
    .sort();
}

export function checksumOf(sql) {
  return createHash('sha256').update(sql, 'utf8').digest('hex');
}

const LEDGER_DDL = `
create table if not exists _migration_ledger (
  id uuid primary key default uuid_generate_v7(),
  company_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  version integer not null default 0,
  name text not null,
  checksum text not null,
  applied_at timestamptz not null default now()
);
`;

async function createBackend() {
  if (process.env.DATABASE_URL !== undefined && process.env.DATABASE_URL !== '') {
    const { default: pg } = await import('pg');
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    return {
      kind: 'pg (DATABASE_URL)',
      query: async (text, params) => client.query(text, params),
      exec: async (sql) => client.query(sql),
      close: async () => client.end(),
    };
  }
  const { PGlite } = await import('@electric-sql/pglite');
  const db = new PGlite();
  return {
    kind: 'pglite (in-memory)',
    query: async (text, params) => db.query(text, params),
    exec: async (sql) => db.exec(sql),
    close: async () => db.close(),
  };
}

export async function applyUp(backend) {
  const files = listUpMigrations();
  await backend.query('select pg_advisory_lock(727272)').catch(() => {
    console.log('migrate: advisory lock unavailable on this backend; continuing single-process');
  });
  try {
    await backend.query(LEDGER_DDL);
    for (const file of files) {
      const sql = readFileSync(`migrations/${file}`, 'utf8');
      const checksum = checksumOf(sql);
      const res = await backend.query('select checksum from _migration_ledger where name = $1', [file]);
      const existing = res.rows[0];
      if (existing !== undefined) {
        if (existing.checksum !== checksum) {
          throw new Error(`migrate: checksum drift for ${file}; already applied with different content`);
        }
        console.log(`migrate: skip ${file} (already applied)`);
        continue;
      }
      console.log(`migrate: applying ${file} ...`);
      await backend.exec(sql);
      await backend.query(
        'insert into _migration_ledger (name, checksum) values ($1, $2)',
        [file, checksum],
      );
      console.log(`migrate: applied ${file}`);
    }
  } finally {
    await backend.query('select pg_advisory_unlock(727272)').catch(() => undefined);
  }
}

const isMain = process.argv[1] !== undefined && process.argv[1].endsWith('migrate.mjs');
if (isMain) {
  const backend = await createBackend();
  console.log(`migrate: backend = ${backend.kind}`);
  try {
    await applyUp(backend);
    console.log('migrate: all migrations applied');
  } catch (err) {
    console.error(`migrate: FAILED: ${err.message}`);
    process.exit(1);
  } finally {
    await backend.close();
  }
}
