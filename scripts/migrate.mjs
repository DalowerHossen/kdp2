// path: scripts/migrate.mjs
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIRECTORY = join(SCRIPT_DIRECTORY, '..', 'migrations');
const LOCK_CLASS_ID = 105031;
const LOCK_OBJECT_ID = 0;

function getPsqlEnvironment() {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl === undefined || databaseUrl.trim().length === 0) {
    throw new Error('DATABASE_URL is required to run migrations.');
  }

  let connection;
  try {
    connection = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL is invalid.');
  }
  if (connection.protocol !== 'postgres:' && connection.protocol !== 'postgresql:') {
    throw new Error('DATABASE_URL must use the postgres or postgresql scheme.');
  }
  const databaseName = decodeURIComponent(connection.pathname.replace(/^\//u, ''));
  if (databaseName.length === 0 || connection.hostname.length === 0) {
    throw new Error('DATABASE_URL must include a host and database name.');
  }

  const environment = { ...process.env };
  environment.PGHOST = connection.hostname.replace(/^\[|\]$/gu, '');
  environment.PGPORT = connection.port || '5432';
  environment.PGDATABASE = databaseName;
  environment.PGUSER = decodeURIComponent(connection.username);
  environment.PGPASSWORD = decodeURIComponent(connection.password);
  environment.PGSSLMODE = connection.searchParams.get('sslmode') ?? 'prefer';
  for (const [parameter, environmentKey] of [
    ['sslrootcert', 'PGSSLROOTCERT'],
    ['sslcert', 'PGSSLCERT'],
    ['sslkey', 'PGSSLKEY'],
    ['connect_timeout', 'PGCONNECT_TIMEOUT'],
  ]) {
    const parameterValue = connection.searchParams.get(parameter);
    if (parameterValue !== null) {
      environment[environmentKey] = parameterValue;
    }
  }
  environment.PGAPPNAME = 'kdp2-migrate';
  return environment;
}

function runPsql(script) {
  const environment = getPsqlEnvironment();
  return new Promise((resolve, reject) => {
    const child = spawn('psql', ['--no-psqlrc', '--quiet', '--set=ON_ERROR_STOP=1'], {
      env: environment,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => process.stdout.write(chunk));
    child.stderr.on('data', (chunk) => process.stderr.write(chunk));
    child.stdin.on('error', () => undefined);
    child.once('error', (error) => {
      if (error.code === 'ENOENT') {
        reject(new Error('The psql client is required to run migrations.'));
        return;
      }
      reject(error);
    });
    child.once('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`psql exited with status ${String(code)}.`));
    });
    child.stdin.end(script);
  });
}

function migrationName(filename) {
  const match = /^(\d{4}_[a-z0-9_]+)\.sql$/u.exec(filename);
  if (match === null || match[1] === undefined) {
    throw new Error(`Invalid migration filename: ${filename}`);
  }
  return match[1];
}

function checksum(contents) {
  return createHash('sha256').update(contents).digest('hex');
}

function ledgerBootstrap() {
  return [
    `SELECT pg_advisory_lock(${LOCK_CLASS_ID}, ${LOCK_OBJECT_ID});`,
    'CREATE SCHEMA IF NOT EXISTS _migration;',
    'CREATE TABLE IF NOT EXISTS _migration.schema_migrations (',
    '  migration_id text PRIMARY KEY,',
    "  checksum text NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'),",
    '  applied_at timestamptz NOT NULL DEFAULT clock_timestamp()',
    ');',
  ].join('\n');
}

async function main() {
  const filenames = (await readdir(MIGRATIONS_DIRECTORY))
    .filter(
      (filename) => /^\d{4}_[a-z0-9_]+\.sql$/u.test(filename) && !filename.endsWith('_down.sql'),
    )
    .sort();
  if (filenames.length === 0) {
    throw new Error('No up migrations were found.');
  }

  const localIds = filenames.map((filename) => migrationName(filename));
  const localIdList = localIds.map((id) => `'${id}'`).join(', ');
  let script = `${ledgerBootstrap()}\n`;
  script += [
    `SELECT CASE WHEN EXISTS (SELECT 1 FROM _migration.schema_migrations WHERE migration_id NOT IN (${localIdList})) THEN 'true' ELSE 'false' END AS unknown_migration`,
    '\\gset ledger_',
    '\\if :ledger_unknown_migration',
    '\\echo Migration ledger contains an ID missing from the local migration set.',
    '\\quit 4',
    '\\endif',
    '',
  ].join('\n');
  for (const [index, filename] of filenames.entries()) {
    const id = migrationName(filename);
    if (id.slice(0, 4) < '0000' || id.slice(0, 4) > '0099') {
      throw new Error(`Migration ${filename} is outside the allowed range 0000-0099.`);
    }
    const downFilename = `${id}_down.sql`;
    const downPath = join(MIGRATIONS_DIRECTORY, downFilename);
    await readFile(downPath);
    const contents = await readFile(join(MIGRATIONS_DIRECTORY, filename), 'utf8');
    const fileChecksum = checksum(contents);
    const prefix = `migration_${index}_`;
    script += [
      `SELECT CASE WHEN EXISTS (SELECT 1 FROM _migration.schema_migrations WHERE migration_id = '${id}') THEN 'true' ELSE 'false' END AS applied,`,
      `       COALESCE((SELECT CASE WHEN checksum = '${fileChecksum}' THEN 'true' ELSE 'false' END FROM _migration.schema_migrations WHERE migration_id = '${id}'), 'false') AS checksum_matches,`,
      `       CASE WHEN NOT EXISTS (SELECT 1 FROM _migration.schema_migrations WHERE migration_id = '${id}') AND EXISTS (SELECT 1 FROM _migration.schema_migrations WHERE migration_id > '${id}') THEN 'true' ELSE 'false' END AS order_violation`,
      `\\gset ${prefix}`,
      `\\if :${prefix}order_violation`,
      `\\echo Migration order gap before ${id}; a later migration is already recorded.`,
      '\\quit 4',
      '\\endif',
      `\\if :${prefix}applied`,
      `\\if :${prefix}checksum_matches`,
      `\\echo Migration ${id} already applied with the current checksum.`,
      '\\else',
      `\\echo Migration checksum mismatch for ${id}.`,
      '\\quit 3',
      '\\endif',
      '\\else',
      'BEGIN;',
      contents,
      `INSERT INTO _migration.schema_migrations (migration_id, checksum) VALUES ('${id}', '${fileChecksum}');`,
      'COMMIT;',
      '\\endif',
      '',
    ].join('\n');
  }
  script += `SELECT pg_advisory_unlock(${LOCK_CLASS_ID}, ${LOCK_OBJECT_ID});\n`;
  await runPsql(script);
  process.stdout.write(`Migration run complete: ${filenames.length} migration file(s) checked.\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'Migration execution failed.';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
