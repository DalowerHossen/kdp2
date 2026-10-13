// path: scripts/verify-rls.mjs
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIRECTORY = join(SCRIPT_DIRECTORY, '..', 'migrations');
const TENANT_ONE_ID = '11111111-1111-4111-8111-111111111111';
const TENANT_TWO_ID = '22222222-2222-4222-8222-222222222222';
const USER_ONE_ID = '33333333-3333-4333-8333-333333333333';
const USER_TWO_ID = '55555555-5555-4555-8555-555555555555';
const AUTH_USER_ONE_ID = '44444444-4444-4444-8444-444444444444';
const AUTH_USER_TWO_ID = '66666666-6666-4666-8666-666666666666';
const PROBE_ROLE = 'kdp2_rls_probe';

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function quoteIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

async function applyMigrations(db) {
  const entries = await readdir(MIGRATIONS_DIRECTORY);
  const filenames = entries
    .filter(
      (filename) => /^\d{4}_[a-z0-9_]+\.sql$/u.test(filename) && !filename.endsWith('_down.sql'),
    )
    .sort();
  if (filenames.length === 0) {
    throw new Error('No up migrations were found in migrations/.');
  }
  for (const filename of filenames) {
    const migrationId = filename.slice(0, -'.sql'.length);
    const sequence = Number.parseInt(migrationId.slice(0, 4), 10);
    if (sequence < 0 || sequence > 99) {
      throw new Error(`Migration ${filename} is outside the allowed range 0000-0099.`);
    }
    const downFilename = `${migrationId}_down.sql`;
    await readFile(join(MIGRATIONS_DIRECTORY, downFilename));
    try {
      await db.exec(await readFile(join(MIGRATIONS_DIRECTORY, filename), 'utf8'));
    } catch (error) {
      throw new Error(`Failed to apply ${filename}: ${errorMessage(error)}`);
    }
    process.stdout.write(`PASS migration up ${filename}.\n`);
  }
}

async function createTenantRows(db) {
  await db.query(
    'INSERT INTO public.companies (id, slug, name) VALUES ($1, $2, $3), ($4, $5, $6)',
    [TENANT_ONE_ID, 'tenant-one', 'RLS Tenant One', TENANT_TWO_ID, 'tenant-two', 'RLS Tenant Two'],
  );
  await db.query(
    'INSERT INTO public.users (id, company_id, auth_user_id, email) VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)',
    [
      USER_ONE_ID,
      TENANT_ONE_ID,
      AUTH_USER_ONE_ID,
      'rls-one@example.invalid',
      USER_TWO_ID,
      TENANT_TWO_ID,
      AUTH_USER_TWO_ID,
      'rls-two@example.invalid',
    ],
  );
}

async function createRestrictedRole(db) {
  await db.exec(`CREATE ROLE ${PROBE_ROLE} NOLOGIN NOSUPERUSER NOBYPASSRLS;`);
  await db.exec(`GRANT USAGE ON SCHEMA public TO ${PROBE_ROLE};`);
  await db.exec(`GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${PROBE_ROLE};`);
  await db.exec(`GRANT INSERT ON public.users TO ${PROBE_ROLE};`);
  const roleResult = await db.query(
    'SELECT rolsuper, rolbypassrls FROM pg_catalog.pg_roles WHERE rolname = $1',
    [PROBE_ROLE],
  );
  const role = roleResult.rows[0];
  if (role === undefined || role.rolsuper !== false || role.rolbypassrls !== false) {
    throw new Error(
      'The restricted RLS role must not be a superuser or bypass row-level security.',
    );
  }
}

async function verifyProductionDefaultDeny(db, tableNames) {
  await db.query(`SET ROLE ${PROBE_ROLE}`);
  for (const tableName of tableNames) {
    const result = await db.query(
      `SELECT count(*)::integer AS visible_rows FROM public.${quoteIdentifier(tableName)}`,
    );
    if (result.rows[0]?.visible_rows !== 0) {
      throw new Error(`Default-deny RLS exposed rows from public.${tableName}.`);
    }
  }
  await db.query("SELECT set_config('app.company_id', $1, false)", [TENANT_ONE_ID]);
  const tenantOneResult = await db.query('SELECT id FROM public.users');
  if (tenantOneResult.rows.length !== 0) {
    throw new Error(
      'The production default-deny policy exposed tenant rows under tenant one context.',
    );
  }
  await db.query("SELECT set_config('app.company_id', $1, false)", [TENANT_TWO_ID]);
  const tenantTwoResult = await db.query('SELECT id FROM public.users');
  if (tenantTwoResult.rows.length !== 0) {
    throw new Error(
      'The production default-deny policy exposed tenant rows under tenant two context.',
    );
  }

  await db.query("SELECT set_config('app.company_id', $1, false)", [TENANT_ONE_ID]);
  const deniedInsertId = '77777777-7777-4777-8777-777777777777';
  const deniedAuthId = '88888888-8888-4888-8888-888888888888';
  try {
    await db.query(
      'INSERT INTO public.users (id, company_id, auth_user_id, email) VALUES ($1, $2, $3, $4)',
      [deniedInsertId, TENANT_ONE_ID, deniedAuthId, 'rls-denied@example.invalid'],
    );
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !('code' in error) ||
      error.code !== '42501' ||
      !error.message.includes('row-level security policy')
    ) {
      throw new Error(
        `Default-deny RLS rejected an insert for an unexpected reason: ${errorMessage(error)}`,
      );
    }
    await db.query('RESET ROLE');
    process.stdout.write(
      `PASS default-deny: restricted role sees zero rows across ${tableNames.length} tables and cannot insert.\n`,
    );
    return;
  }
  await db.query('RESET ROLE');
  throw new Error('The production default-deny policy allowed a tenant user insert.');
}

async function verifyTenantIsolation(db) {
  await db.query(
    `CREATE POLICY verify_company_isolation ON public.users FOR SELECT TO ${PROBE_ROLE} USING (company_id = public.current_company_id())`,
  );
  await db.query(`SET ROLE ${PROBE_ROLE}`);

  await db.query("SELECT set_config('app.company_id', $1, false)", [TENANT_ONE_ID]);
  const tenantOneOwnRows = await db.query(
    'SELECT company_id FROM public.users ORDER BY company_id',
  );
  const tenantOneCrossRows = await db.query('SELECT id FROM public.users WHERE company_id = $1', [
    TENANT_TWO_ID,
  ]);
  if (
    tenantOneOwnRows.rows.length !== 1 ||
    tenantOneOwnRows.rows[0]?.company_id !== TENANT_ONE_ID ||
    tenantOneCrossRows.rows.length !== 0
  ) {
    throw new Error('Tenant one could not read its own row exclusively.');
  }

  await db.query("SELECT set_config('app.company_id', $1, false)", [TENANT_TWO_ID]);
  const tenantTwoOwnRows = await db.query(
    'SELECT company_id FROM public.users ORDER BY company_id',
  );
  const tenantTwoCrossRows = await db.query('SELECT id FROM public.users WHERE company_id = $1', [
    TENANT_ONE_ID,
  ]);
  if (
    tenantTwoOwnRows.rows.length !== 1 ||
    tenantTwoOwnRows.rows[0]?.company_id !== TENANT_TWO_ID ||
    tenantTwoCrossRows.rows.length !== 0
  ) {
    throw new Error('Tenant two could not read its own row exclusively.');
  }

  await db.query('RESET ROLE');
  process.stdout.write(
    'PASS tenant isolation: each tenant reads its own row and cross-tenant reads return zero rows under an isolated verification policy.\n',
  );
}

async function main() {
  const db = new PGlite({ extensions: { pgcrypto } });
  try {
    await applyMigrations(db);
    await createTenantRows(db);
    await createRestrictedRole(db);
    const tableResult = await db.query(
      "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename",
    );
    const tableNames = tableResult.rows.map((table) => table.tablename);
    if (tableNames.length === 0) {
      throw new Error('No public tables were created by the migrations.');
    }
    await verifyProductionDefaultDeny(db, tableNames);
    await verifyTenantIsolation(db);
    process.stdout.write(
      `RLS verification passed: default-deny across ${tableNames.length} tables and isolated reads for two tenants.\n`,
    );
  } finally {
    await db.close();
  }
}

main().catch((error) => {
  process.stderr.write(`RLS verification failed: ${errorMessage(error)}\n`);
  process.exitCode = 1;
});
