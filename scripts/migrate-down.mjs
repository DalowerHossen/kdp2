#!/usr/bin/env node
// path: scripts/migrate-down.mjs
// Rollback runner: pops the most recently applied migrations (--all for a
// full teardown), executing each file's _down.sql in reverse order.
import { readFileSync, existsSync } from 'node:fs';

async function createBackend() {
  if (process.env.DATABASE_URL !== undefined && process.env.DATABASE_URL !== '') {
    const { default: pg } = await import('pg');
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    return {
      kind: 'pg',
      query: async (text, params) => client.query(text, params),
      exec: async (sql) => client.query(sql),
      close: async () => client.end(),
    };
  }
  const { PGlite } = await import('@electric-sql/pglite');
  const db = new PGlite();
  return {
    kind: 'pglite',
    query: async (text, params) => db.query(text, params),
    exec: async (sql) => db.exec(sql),
    close: async () => db.close(),
  };
}

async function main() {
  const all = process.argv.includes('--all');
  const backend = await createBackend();
  console.log(`migrate-down: backend = ${backend.kind}`);
  try {
    const res = await backend.query('select name from _migration_ledger order by name desc');
    const applied = res.rows.map((r) => r.name);
    if (applied.length === 0) {
      console.log('migrate-down: nothing applied');
      return;
    }
    const batch = all ? applied : applied.slice(0, 1);
    for (const name of batch) {
      const downFile = `migrations/${name.replace(/\.sql$/, '_down.sql')}`;
      if (!existsSync(downFile)) {
        throw new Error(`migrate-down: ${name} has no ${downFile}`);
      }
      console.log(`migrate-down: rolling back ${name}`);
      await backend.exec(readFileSync(downFile, 'utf8'));
      await backend.query('delete from _migration_ledger where name = $1', [name]);
      console.log(`migrate-down: rolled back ${name}`);
    }
    console.log('migrate-down: done');
  } catch (err) {
    console.error(`migrate-down: FAILED: ${err.message}`);
    process.exit(1);
  } finally {
    await backend.close();
  }
}

await main();
