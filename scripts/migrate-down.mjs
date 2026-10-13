// path: scripts/migrate-down.mjs
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIRECTORY = join(SCRIPT_DIRECTORY, '..', 'migrations');
const LOCK_CLASS_ID = 105031;
const LOCK_OBJECT_ID = 0;

function getPsqlEnvironment() {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl === undefined || databaseUrl.trim().length === 0) {
    throw new Error('DATABASE_URL is required to roll back migrations.');
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
  environment.PGAPPNAME = 'kdp2-migrate-down';
  return environment;
}

function runPsql(script, captureOutput = false) {
  const environment = getPsqlEnvironment();
  const argumentsList = ['--no-psqlrc', '--quiet', '--set=ON_ERROR_STOP=1'];
  if (captureOutput) {
    argumentsList.push('--tuples-only', '--no-align');
  }
  return new Promise((resolve, reject) => {
    const child = spawn('psql', argumentsList, {
      env: environment,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let capturedOutput = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      if (captureOutput) {
        capturedOutput += chunk;
      } else {
        process.stdout.write(chunk);
      }
    });
    child.stderr.on('data', (chunk) => process.stderr.write(chunk));
    child.stdin.on('error', () => undefined);
    child.once('error', (error) => {
      if (error.code === 'ENOENT') {
        reject(new Error('The psql client is required to roll back migrations.'));
        return;
      }
      reject(error);
    });
    child.once('close', (code) => {
      if (code === 0) {
        resolve(capturedOutput.trim());
        return;
      }
      reject(new Error(`psql exited with status ${String(code)}.`));
    });
    child.stdin.end(script);
  });
}

function checksum(contents) {
  return createHash('sha256').update(contents).digest('hex');
}

function ledgerBootstrap() {
  return [
    'CREATE SCHEMA IF NOT EXISTS _migration;',
    'CREATE TABLE IF NOT EXISTS _migration.schema_migrations (',
    '  migration_id text PRIMARY KEY,',
    "  checksum text NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'),",
    '  applied_at timestamptz NOT NULL DEFAULT clock_timestamp()',
    ');',
  ].join('\n');
}

async function main() {
  await runPsql(ledgerBootstrap());
  const latestOutput = await runPsql(
    "SELECT migration_id || '|' || checksum FROM _migration.schema_migrations ORDER BY migration_id DESC LIMIT 1;",
    true,
  );
  if (latestOutput.length === 0) {
    process.stdout.write('No migrations are recorded; nothing to roll back.\n');
    return;
  }

  const [migrationId, recordedChecksum] = latestOutput.split('|');
  if (
    latestOutput.split('|').length !== 2 ||
    migrationId === undefined ||
    recordedChecksum === undefined ||
    !/^\d{4}_[a-z0-9_]+$/u.test(migrationId) ||
    migrationId.slice(0, 4) < '0000' ||
    migrationId.slice(0, 4) > '0099'
  ) {
    throw new Error('The latest migration ledger entry is invalid.');
  }

  const upFile = join(MIGRATIONS_DIRECTORY, `${migrationId}.sql`);
  const downFile = join(MIGRATIONS_DIRECTORY, `${migrationId}_down.sql`);
  const [upContents, downContents] = await Promise.all([
    readFile(upFile, 'utf8'),
    readFile(downFile, 'utf8'),
  ]);
  const currentChecksum = checksum(upContents);
  if (currentChecksum !== recordedChecksum) {
    throw new Error(`Migration checksum mismatch for ${migrationId}; rollback was refused.`);
  }

  const script = [
    `SELECT pg_advisory_lock(${LOCK_CLASS_ID}, ${LOCK_OBJECT_ID});`,
    `SELECT CASE WHEN EXISTS (SELECT 1 FROM _migration.schema_migrations WHERE migration_id = '${migrationId}' AND checksum = '${currentChecksum}') AND (SELECT migration_id FROM _migration.schema_migrations ORDER BY migration_id DESC LIMIT 1) = '${migrationId}' THEN 'true' ELSE 'false' END AS rollback_is_latest`,
    '\\gset rollback_',
    '\\if :rollback_rollback_is_latest',
    'BEGIN;',
    downContents,
    `DELETE FROM _migration.schema_migrations WHERE migration_id = '${migrationId}' AND checksum = '${currentChecksum}';`,
    'COMMIT;',
    `\\echo Rolled back migration ${migrationId}.`,
    '\\else',
    `\\echo Migration ${migrationId} is no longer the latest ledger entry.`,
    '\\quit 4',
    '\\endif',
    `SELECT pg_advisory_unlock(${LOCK_CLASS_ID}, ${LOCK_OBJECT_ID});`,
    '',
  ].join('\n');
  await runPsql(script);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'Migration rollback failed.';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
