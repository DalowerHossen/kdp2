#!/usr/bin/env node
// path: scripts/verify-db.mjs
// Batch 6: applies every migration up and down against PGlite (real
// PostgreSQL compiled to WASM), and asserts the table invariants of
// CONTRACTS.md section 1 on every table.
import { readdirSync, readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const EXEMPT_AUDIT_TRIGGER = new Set(['audit_logs', 'audit_log_hash_chain', '_migration_ledger']);
const BASE_COLUMNS = ['id', 'company_id', 'created_at', 'updated_at', 'deleted_at', 'version'];

const ups = readdirSync('migrations')
  .filter((f) => /^\d{4}_.*\.sql$/.test(f) && !f.endsWith('_down.sql'))
  .sort();

const failures = [];
const passes = [];
function fail(msg) {
  failures.push(msg);
  console.error(`verify-db: FAIL: ${msg}`);
}
function pass(msg) {
  passes.push(msg);
  console.log(`verify-db: PASS: ${msg}`);
}

const db = new PGlite();
const q = async (text, params) => db.query(text, params);

// ---- apply up -------------------------------------------------------------
for (const file of ups) {
  try {
    await db.exec(readFileSync(`migrations/${file}`, 'utf8'));
    console.log(`verify-db: applied ${file}`);
  } catch (err) {
    fail(`migration ${file} failed to apply: ${err.message}`);
    process.exit(1);
  }
}

// ---- per-table invariants ---------------------------------------------------
const tablesRes = await q(
  `select tablename as name from pg_tables where schemaname = 'public' order by tablename`,
);
const tables = tablesRes.rows.map((r) => r.name);
if (tables.length === 0) fail('no tables found after applying migrations');

for (const table of tables) {
  const cols = (
    await q(
      `select column_name as c, data_type as t, numeric_precision as p, numeric_scale as s
       from information_schema.columns where table_schema = 'public' and table_name = $1`,
      [table],
    )
  ).rows;
  const colNames = cols.map((c) => c.c);

  for (const base of BASE_COLUMNS) {
    if (!colNames.includes(base)) fail(`${table}: missing base column ${base}`);
  }

  const cls = (
    await q(`select relrowsecurity as rls, relforcerowsecurity as frls
             from pg_class where relname = $1 and relnamespace = 'public'::regnamespace`, [table])
  ).rows[0];
  if (cls === undefined || cls.rls !== true) fail(`${table}: row level security not enabled`);
  if (cls === undefined || cls.frls !== true) fail(`${table}: row level security not forced`);

  const deny = (
    await q(`select qual from pg_policies where schemaname = 'public' and tablename = $1 and policyname = $2`,
      [table, `deny_all_${table}`])
  ).rows[0];
  if (deny === undefined) fail(`${table}: missing deny_all_${table} policy`);
  else if (!String(deny.qual).includes('false')) fail(`${table}: deny policy qual is not false`);

  const idx = (
    await q(`select indexdef from pg_indexes where schemaname = 'public' and tablename = $1`, [table])
  ).rows.map((r) => String(r.indexdef));
  if (!idx.some((d) => d.includes('(company_id'))) {
    fail(`${table}: missing company_id index`);
  }
  if (!idx.some((d) => d.includes('(created_at'))) {
    fail(`${table}: missing created_at index`);
  }

  for (const c of cols) {
    if (c.t === 'numeric' && !(c.p === 18 && c.s === 4)) {
      fail(`${table}.${c.c}: numeric(${c.p},${c.s}) - must be numeric(18,4)`);
    }
    if (['real', 'double precision'].includes(c.t)) {
      fail(`${table}.${c.c}: forbidden column type ${c.t}`);
    }
  }

  if (!EXEMPT_AUDIT_TRIGGER.has(table)) {
    const trg = (
      await q(`select tgname from pg_trigger t join pg_class c on c.oid = t.tgrelid
               where c.relname = $1 and not t.tgisinternal`, [table])
    ).rows.map((r) => r.tgname);
    if (!trg.includes(`trg_${table}_audit`)) fail(`${table}: missing trg_${table}_audit trigger`);
    if (!trg.includes(`trg_${table}_updated`)) fail(`${table}: missing trg_${table}_updated trigger`);
  }

  pass(`${table}: invariants satisfied`);
}

// ---- functional proofs ------------------------------------------------------
const v7 = (await q('select uuid_generate_v7()::text as id')).rows[0].id;
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v7)) {
  fail(`uuid_generate_v7 produced non-v7 value ${v7}`);
} else {
  pass('uuid_generate_v7 returns version-7 UUIDs');
}

await q(`select set_config('app.platform_admin', 'true', false)`);
await q(`insert into plans (code, name) values ('proof-a', 'Proof Plan A')`);
await q(`insert into plans (code, name) values ('proof-b', 'Proof Plan B')`);

const auditRows = (
  await q(`select prev_hash, entry_hash from audit_logs order by created_at, id`)
).rows;
if (auditRows.length < 2) {
  fail(`expected >= 2 audit rows from trigger, found ${auditRows.length}`);
} else {
  const linked = auditRows.every((row, i) => i === 0 || row.prev_hash === auditRows[i - 1].entry_hash);
  if (!linked) fail('audit hash chain is not linked row-to-row');
  else pass('audit trigger inserted hash-chained rows');
}

const head = (await q(`select last_hash from audit_log_hash_chain limit 1`)).rows[0];
if (head === undefined || head.last_hash !== auditRows[auditRows.length - 1]?.entry_hash) {
  fail('audit_log_hash_chain head does not equal the last entry hash');
} else {
  pass('audit hash-chain head tracks the last entry');
}

// append-only: update and delete must be suppressed by the rules.
const before = auditRows[0];
await q(`update audit_logs set action = 'tampered' where entry_hash = $1`, [before.entry_hash]);
await q(`delete from audit_logs where entry_hash = $1`, [before.entry_hash]);
const after = (
  await q(`select action from audit_logs where entry_hash = $1`, [before.entry_hash])
).rows[0];
if (after === undefined || after.action === 'tampered') {
  fail('audit_logs is mutable - append-only rules broken');
} else {
  pass('audit_logs is append-only (update/delete suppressed)');
}

// ------ down migrations: full teardown, in reverse --------------------------
for (const file of [...ups].reverse()) {
  const downName = file.replace(/\.sql$/, '_down.sql');
  try {
    await db.exec(readFileSync(`migrations/${downName}`, 'utf8'));
    console.log(`verify-db: rolled back ${downName}`);
  } catch (err) {
    fail(`down migration ${downName} failed: ${err.message}`);
  }
}

const remaining = (
  await q(`select count(*)::int as n from pg_tables where schemaname = 'public'`)
).rows[0].n;
if (remaining !== 0) {
  fail(`down migrations left ${remaining} table(s) behind`);
} else {
  pass('all down migrations applied; schema is empty');
}

// re-apply to prove idempotency of the full cycle
for (const file of ups) {
  await db.exec(readFileSync(`migrations/${file}`, 'utf8'));
}
pass('re-applied all migrations cleanly after teardown');

console.log(`verify-db: ${passes.length} pass line(s) for ${tables.length} table(s)`);
if (failures.length > 0) {
  console.error(`verify-db: FAILED with ${failures.length} failure(s)`);
  process.exit(1);
}
console.log('verify-db: OK');
process.exit(0);
