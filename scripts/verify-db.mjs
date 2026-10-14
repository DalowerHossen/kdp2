// path: scripts/verify-db.mjs
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIRECTORY = join(SCRIPT_DIRECTORY, '..', 'migrations');
const MIGRATION_PATTERN = /^\d{4}_[a-z0-9_]+\.sql$/u;
const DOWN_MIGRATION_PATTERN = /^\d{4}_[a-z0-9_]+_down\.sql$/u;
const REQUIRED_COLUMNS = ['id', 'company_id', 'created_at', 'updated_at', 'deleted_at', 'version'];
const MONEY_COLUMN_PATTERN =
  /^(?:amount|balance|cost|discount_value|fee|invoice_total|monthly_price|payout_amount|price_[a-z0-9_]+|refund_amount|subtotal|tax_amount|total_amount|yearly_price)$/u;

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

async function loadMigrations() {
  const entries = await readdir(MIGRATIONS_DIRECTORY);
  const filenames = entries
    .filter((filename) => MIGRATION_PATTERN.test(filename) && !filename.endsWith('_down.sql'))
    .sort();
  if (filenames.length === 0) {
    throw new Error('No up migrations were found in migrations/.');
  }

  const upFilenameSet = new Set(filenames);
  const downFilenames = entries.filter((filename) => DOWN_MIGRATION_PATTERN.test(filename));
  const migrations = [];
  for (const filename of filenames) {
    const migrationId = filename.slice(0, -'.sql'.length);
    const sequence = Number.parseInt(migrationId.slice(0, 4), 10);
    if (sequence < 0 || sequence > 99) {
      throw new Error(`Migration ${filename} is outside the allowed range 0000-0099.`);
    }

    const downFilename = `${migrationId}_down.sql`;
    if (!downFilenames.includes(downFilename)) {
      throw new Error(`Migration ${filename} has no matching ${downFilename}.`);
    }
    const [upSql, downSql] = await Promise.all([
      readFile(join(MIGRATIONS_DIRECTORY, filename), 'utf8'),
      readFile(join(MIGRATIONS_DIRECTORY, downFilename), 'utf8'),
    ]);
    migrations.push({ migrationId, filename, downFilename, upSql, downSql });
  }

  for (const downFilename of downFilenames) {
    const upFilename = downFilename.replace(/_down\.sql$/u, '.sql');
    if (!upFilenameSet.has(upFilename)) {
      throw new Error(`Down migration ${downFilename} has no matching up migration.`);
    }
  }
  return migrations;
}

async function verifyTable(db, tableName) {
  const columnResult = await db.query(
    'SELECT column_name, data_type, numeric_precision, numeric_scale FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2',
    ['public', tableName],
  );
  const columns = new Map(columnResult.rows.map((column) => [column.column_name, column]));
  const missingColumns = REQUIRED_COLUMNS.filter((columnName) => !columns.has(columnName));
  if (missingColumns.length > 0) {
    throw new Error(`${tableName} is missing required columns: ${missingColumns.join(', ')}.`);
  }

  const relationResult = await db.query(
    'SELECT relrowsecurity, relforcerowsecurity FROM pg_catalog.pg_class WHERE oid = $1::regclass',
    [`public.${tableName}`],
  );
  const relation = relationResult.rows[0];
  if (
    relation === undefined ||
    relation.relrowsecurity !== true ||
    relation.relforcerowsecurity !== true
  ) {
    throw new Error(`${tableName} does not have enabled and forced row-level security.`);
  }

  const policyResult = await db.query(
    'SELECT policyname, cmd, qual, with_check FROM pg_catalog.pg_policies WHERE schemaname = $1 AND tablename = $2',
    ['public', tableName],
  );
  const policyName = `policy_${tableName}_default_deny`;
  const denyPolicy = policyResult.rows.find((policy) => policy.policyname === policyName);
  if (
    denyPolicy === undefined ||
    denyPolicy.cmd !== 'ALL' ||
    !String(denyPolicy.qual).toLowerCase().includes('deny_all') ||
    !String(denyPolicy.with_check).toLowerCase().includes('deny_all')
  ) {
    throw new Error(`${tableName} is missing its default-deny policy.`);
  }

  const indexResult = await db.query(
    'SELECT indexname FROM pg_catalog.pg_indexes WHERE schemaname = $1 AND tablename = $2',
    ['public', tableName],
  );
  const indexNames = new Set(indexResult.rows.map((index) => index.indexname));
  for (const suffix of ['company_id', 'created_at']) {
    const requiredIndex = `idx_${tableName}_${suffix}`;
    if (!indexNames.has(requiredIndex)) {
      throw new Error(`${tableName} is missing index ${requiredIndex}.`);
    }
  }

  const triggerResult = await db.query(
    'SELECT trigger_row.tgname AS trigger_name, trigger_function.proname AS function_name FROM pg_catalog.pg_trigger AS trigger_row JOIN pg_catalog.pg_proc AS trigger_function ON trigger_function.oid = trigger_row.tgfoid WHERE trigger_row.tgrelid = $1::regclass AND NOT trigger_row.tgisinternal',
    [`public.${tableName}`],
  );
  const hasAuditTrigger = triggerResult.rows.some(
    (trigger) =>
      trigger.function_name === 'audit_trigger' || String(trigger.trigger_name).includes('audit'),
  );
  if (!hasAuditTrigger) {
    throw new Error(`${tableName} is missing its audit trigger.`);
  }

  const moneyColumns = columnResult.rows.filter((column) =>
    MONEY_COLUMN_PATTERN.test(column.column_name),
  );
  for (const column of moneyColumns) {
    if (
      column.data_type !== 'numeric' ||
      column.numeric_precision !== 18 ||
      column.numeric_scale !== 4
    ) {
      throw new Error(`${tableName}.${column.column_name} must use numeric(18,4).`);
    }
  }

  process.stdout.write(
    `PASS table ${tableName}: base columns, RLS, default-deny, audit trigger, indexes, and ${moneyColumns.length} money column(s).\n`,
  );
}

async function verifyRollback(db) {
  const tableResult = await db.query(
    "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'",
  );
  if (tableResult.rows.length > 0) {
    throw new Error(
      `Rollback left public tables behind: ${tableResult.rows.map((table) => table.tablename).join(', ')}.`,
    );
  }
  const enumResult = await db.query(
    "SELECT type_row.typname FROM pg_catalog.pg_type AS type_row JOIN pg_catalog.pg_namespace AS namespace_row ON namespace_row.oid = type_row.typnamespace WHERE namespace_row.nspname = 'public' AND type_row.typtype = 'e'",
  );
  if (enumResult.rows.length > 0) {
    throw new Error(
      `Rollback left public enum types behind: ${enumResult.rows.map((type) => type.typname).join(', ')}.`,
    );
  }
  const extensionResult = await db.query(
    "SELECT extname FROM pg_catalog.pg_extension WHERE extname = 'pgcrypto'",
  );
  if (extensionResult.rows.length > 0) {
    throw new Error('Rollback left the pgcrypto extension installed.');
  }
  const helperResult = await db.query(
    "SELECT procedure_row.proname FROM pg_catalog.pg_proc AS procedure_row JOIN pg_catalog.pg_namespace AS namespace_row ON namespace_row.oid = procedure_row.pronamespace WHERE namespace_row.nspname = 'public' AND procedure_row.proname IN ('uuid_generate_v7', 'audit_trigger')",
  );
  if (helperResult.rows.length > 0) {
    throw new Error(
      `Rollback left migration helper functions behind: ${helperResult.rows.map((item) => item.proname).join(', ')}.`,
    );
  }
}

async function main() {
  const migrations = await loadMigrations();
  const db = new PGlite({ extensions: { pgcrypto } });
  try {
    for (const migration of migrations) {
      try {
        await db.exec(migration.upSql);
      } catch (error) {
        throw new Error(`Failed to apply ${migration.filename}: ${errorMessage(error)}`);
      }
      process.stdout.write(`PASS migration up ${migration.filename}.\n`);
    }

    const tableResult = await db.query(
      "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename",
    );
    if (tableResult.rows.length === 0) {
      throw new Error('No public tables were created by the migrations.');
    }
    for (const table of tableResult.rows) {
      await verifyTable(db, table.tablename);
    }

    for (const migration of [...migrations].reverse()) {
      try {
        await db.exec(migration.downSql);
      } catch (error) {
        throw new Error(`Failed to apply ${migration.downFilename}: ${errorMessage(error)}`);
      }
      process.stdout.write(`PASS migration down ${migration.downFilename}.\n`);
    }
    await verifyRollback(db);
    process.stdout.write(
      `Database verification passed: ${migrations.length} migration pair(s), ${tableResult.rows.length} table(s), and full rollback.\n`,
    );
  } finally {
    await db.close();
  }
}

main().catch((error) => {
  process.stderr.write(`Database verification failed: ${errorMessage(error)}\n`);
  process.exitCode = 1;
});
