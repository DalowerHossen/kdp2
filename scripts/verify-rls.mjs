#!/usr/bin/env node
// path: scripts/verify-rls.mjs
// Batch 6: proves default-deny and cross-tenant isolation under FORCE RLS.
import { readdirSync, readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const ups = readdirSync('migrations')
  .filter((f) => /^\d{4}_.*\.sql$/.test(f) && !f.endsWith('_down.sql'))
  .sort();

const db = new PGlite();
const q = async (text, params) => db.query(text, params);

for (const file of ups) {
  await db.exec(readFileSync(`migrations/${file}`, 'utf8'));
}

// PGlite connects as the bootstrap superuser; superusers bypass row-level
// security (even FORCE RLS). To prove the policies we must run the checks as
// a non-superuser application role that owns nothing.
await db.exec(`
  drop role if exists kd_verify_app;
  create role kd_verify_app nologin nosuperuser nocreatedb nocreaterole noinherit;
  grant usage on schema public to kd_verify_app;
  grant select, insert, update, delete on all tables in schema public to kd_verify_app;
  grant execute on all functions in schema public to kd_verify_app;
`);
await q(`set role kd_verify_app`);

const failures = [];
function check(name, condition) {
  if (condition) {
    console.log(`verify-rls: PASS: ${name}`);
  } else {
    failures.push(name);
    console.error(`verify-rls: FAIL: ${name}`);
  }
}

// ---- fixtures as platform admin -------------------------------------------
await q(`select set_config('app.platform_admin', 'true', false)`);

const companyA = (
  await q(`insert into companies (legal_name, display_name, slug) values
           ('Tenant A LLC', 'Tenant A', 'tenant-a-proof') returning id`)
).rows[0].id;
const companyB = (
  await q(`insert into companies (legal_name, display_name, slug) values
           ('Tenant B LLC', 'Tenant B', 'tenant-b-proof') returning id`)
).rows[0].id;
const userId = (
  await q(`insert into users (email, full_name) values ('owner-a@example.com', 'Owner A') returning id`)
).rows[0].id;
await q(`insert into memberships (company_id, user_id, role) values ($1, $2, 'owner')`, [companyA, userId]);
const planId = (
  await q(`insert into plans (code, name) values ('proof-rls', 'Proof RLS Plan') returning id`)
).rows[0].id;
await q(
  `insert into subscriptions (company_id, plan_id, current_period_start, current_period_end)
   values ($1, $2, now(), now() + interval '30 days')`,
  [companyA, planId],
);
await q(
  `insert into subscriptions (company_id, plan_id, current_period_start, current_period_end)
   values ($1, $2, now(), now() + interval '30 days')`,
  [companyB, planId],
);

function asTenant(companyId, uid) {
  return q(`select
    set_config('app.platform_admin', 'false', false),
    set_config('app.company_id', $1, false),
    set_config('app.user_id', $2, false)`, [companyId, uid]);
}
function asPlatform() {
  return q(`select set_config('app.platform_admin', 'true', false),
                   set_config('app.company_id', '', false)`);
}

// ---- tenant A sees only its own rows ---------------------------------------
await asTenant(companyA, userId);
let rows = (await q(`select id from companies`)).rows;
check('tenant A reads exactly its own company row', rows.length === 1 && rows[0].id === companyA);

rows = (await q(`select company_id from subscriptions`)).rows;
check('tenant A sees exactly 1 subscription (its own)', rows.length === 1 && rows[0].company_id === companyA);

const upd = await q(`update subscriptions set status = 'cancelled' where company_id = $1`, [companyB]);
check('tenant A cannot update tenant B subscriptions', upd.affectedRows === 0 || upd.rowCount === 0);

let insertBlocked = false;
try {
  await q(
    `insert into subscriptions (company_id, plan_id, current_period_start, current_period_end)
     values ($1, $2, now(), now() + interval '30 days')`,
    [companyB, planId],
  );
} catch (err) {
  insertBlocked = /row.level security|row violates/i.test(err.message);
}
check('tenant A cannot insert a subscription for tenant B', insertBlocked);

const catalog = (await q(`select id from plans`)).rows;
check('catalog (plans) remains readable cross-tenant', catalog.length >= 1);

// ---- tenant B isolation mirror ---------------------------------------------
await asTenant(companyB, '00000000-0000-0000-0000-000000000000');
rows = (await q(`select id from companies`)).rows;
check('tenant B reads exactly its own company row', rows.length === 1 && rows[0].id === companyB);
rows = (await q(`select company_id from subscriptions`)).rows;
check('tenant B sees its own subscription after A attempted updates', rows.length === 1);

// ---- default deny: no context at all ---------------------------------------
await q(`select set_config('app.platform_admin', 'false', false),
                set_config('app.company_id', '', false)`);
rows = (await q(`select id from companies`)).rows;
check('empty tenant context reads zero company rows', rows.length === 0);
rows = (await q(`select id from subscriptions`)).rows;
check('empty tenant context reads zero subscription rows', rows.length === 0);

// ---- platform admin reads across tenants ------------------------------------
await asPlatform();
rows = (await q(`select id from companies`)).rows;
check('platform admin reads all companies', rows.length === 2);

if (failures.length > 0) {
  console.error(`verify-rls: FAILED with ${failures.length} failure(s)`);
  process.exit(1);
}
console.log('verify-rls: OK (default-deny and cross-tenant isolation proven)');
process.exit(0);
