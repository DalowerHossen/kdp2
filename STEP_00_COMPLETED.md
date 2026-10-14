<!-- path: STEP_00_COMPLETED.md -->
# STEP_00 — Foundation and Governance: COMPLETED

Executed per `docs/execution/STEP_00_foundation.md`. Every exit-gate command in
section 7 ran and exited 0. Outputs are pasted below, trimmed only of blank lines.

Environment: Node v22.22.3, npm 10.x, Next.js 14.2.35, TypeScript 5.6.3,
@electric-sql/pglite 0.2.17, pg 8.13.1. Branch `arena/60759d4a-kdp2` (the Arena
working branch; the environment fixes the branch name, otherwise identical in
role to `kd/step-00-foundation`, branched from `main` @ c584911).

## Exit gate output

### npm install

```
added 443 packages, and audited 444 packages in 33s
(rerun after edits: up to date, audited 444 packages)
```

### npm run typecheck

```
> kd-solution-it@0.0.1 typecheck
> tsc --noEmit
exit=0
```

### npm run lint

```
> kd-solution-it@0.0.1 lint
> eslint . --max-warnings=0
exit=0
```

### npm run build

```
✓ Compiled successfully
✓ Generating static pages (7/7)

Route (app)                              Size     First Load JS
┌ ƒ /                                    158 B          87.4 kB
├ ƒ /_not-found                          158 B          87.4 kB
├ ƒ /admin                               158 B          87.4 kB
├ ƒ /dashboard                           158 B          87.4 kB
└ ○ /icon.svg                            0 B                0 B
+ First Load JS shared by all            87.2 kB

ƒ Middleware                             57.1 kB
exit=0
```

### npm run verify

```
feature-coverage: implemented 0 of 4187
feature-coverage: OK

verify: summary
                           0 tokens:check         26ms
                           0 english-only         125ms
                           0 money-types          85ms
                           0 path-comment         117ms
                           0 forbidden-tokens     149ms
                           0 no-test-files        6ms
                           0 forbidden-brands     243ms
                           0 migration-lint       180ms
                           0 nav-integrity        30ms
                           0 feature-coverage     131ms
  skipped (no step identity) step-boundaries      0ms
verify: OK (11 guards executed or explicitly skipped)
exit=0
```

### npm run verify-db

Every statement of 0000–0005 applied to a fresh PGlite database; per-table
invariant pass lines (base columns, RLS enabled + forced, `deny_all_<table>`
qual false, `company_id` + `created_at` indexes, numeric money columns exactly
(18,4), no float/real/double, audit/updated triggers where applicable):

```
verify-db: PASS: _migration_ledger: invariants satisfied
verify-db: PASS: admin_sub_roles: invariants satisfied
verify-db: PASS: audit_log_hash_chain: invariants satisfied
verify-db: PASS: audit_logs: invariants satisfied
verify-db: PASS: companies: invariants satisfied
verify-db: PASS: coupons: invariants satisfied
verify-db: PASS: device_fingerprints: invariants satisfied
verify-db: PASS: entitlements: invariants satisfied
verify-db: PASS: idempotency_keys: invariants satisfied
verify-db: PASS: ip_reputation: invariants satisfied
verify-db: PASS: login_attempts: invariants satisfied
verify-db: PASS: memberships: invariants satisfied
verify-db: PASS: permissions: invariants satisfied
verify-db: PASS: plan_limits: invariants satisfied
verify-db: PASS: plans: invariants satisfied
verify-db: PASS: rate_limit_buckets: invariants satisfied
verify-db: PASS: role_permissions: invariants satisfied
verify-db: PASS: roles: invariants satisfied
verify-db: PASS: sessions: invariants satisfied
verify-db: PASS: subscriptions: invariants satisfied
verify-db: PASS: users: invariants satisfied
verify-db: PASS: webhook_processed_events: invariants satisfied
verify-db: PASS: uuid_generate_v7 returns version-7 UUIDs
verify-db: PASS: audit trigger inserted hash-chained rows
verify-db: PASS: audit hash-chain head tracks the last entry
verify-db: PASS: audit_logs is append-only (update/delete suppressed)
verify-db: rolled back 0005_plans_down.sql
verify-db: rolled back 0004_security_down.sql
verify-db: rolled back 0003_audit_down.sql
verify-db: rolled back 0002_enums_down.sql
verify-db: rolled back 0001_platform_core_down.sql
verify-db: rolled back 0000_extensions_down.sql
verify-db: PASS: all down migrations applied; schema is empty
verify-db: PASS: re-applied all migrations cleanly after teardown
verify-db: 28 pass line(s) for 22 table(s)
verify-db: OK
exit=0
```

### npm run verify-rls

```
verify-rls: PASS: tenant A reads exactly its own company row
verify-rls: PASS: tenant A sees exactly 1 subscription (its own)
verify-rls: PASS: tenant A cannot update tenant B subscriptions
verify-rls: PASS: tenant A cannot insert a subscription for tenant B
verify-rls: PASS: catalog (plans) remains readable cross-tenant
verify-rls: PASS: tenant B reads exactly its own company row
verify-rls: PASS: tenant B sees its own subscription after A attempted updates
verify-rls: PASS: empty tenant context reads zero company rows
verify-rls: PASS: empty tenant context reads zero subscription rows
verify-rls: PASS: platform admin reads all companies
verify-rls: OK (default-deny and cross-tenant isolation proven)
exit=0
```

### node scripts/build-feature-manifest.mjs

```
manifest: 4187 records
manifest: renumber map applied to region C (158 entries), e.g. 3451->4030, 3452->4031, 3453->4032
manifest: per-step counts:
  step 01: 450
  step 02: 40
  step 03: 133
  step 04: 109
  step 05: 145
  step 06: 499
  step 07: 390
  step 08: 325
  step 09: 323
  step 10: 499
  step 11: 264
  step 12: 273
  step 13: 158
  step 14: 158
  step 15: 421
manifest: printed ids appearing twice: 158 (3451..3608, expected)
feature-manifest: OK (4187 records, per-step counts verified)
exit=0
```

## Additional proofs demanded by the playbook

- `docs/feature-manifest.json` contains exactly **4,187** records — printed
  above ("manifest: 4187 records") and reverified by `feature-coverage` on every
  `npm run verify` (records shape includes `enHint`, `implemented`,
  `implementedBy`, `implementedAt`).
- Per-step counts sum to 4,187:
  450+40+133+109+145+499+390+325+323+499+264+273+158+158+421 = 4187. ✓
- Printed IDs 3451–3608 appear exactly twice in `FEATURE_LIST.md` (the region C
  physical duplication, 158 ids) and exactly once each as canonical manifest ids
  4030–4187. The builder hard-fails on any deviation.
- `npm run verify` names every guard it executed — see summary table above
  (tokens:check, english-only, money-types, path-comment, forbidden-tokens,
  no-test-files, forbidden-brands, migration-lint, nav-integrity,
  feature-coverage; step-boundaries runs when a step identity exists and is
  otherwise explicitly reported as skipped).
- `verify-db` prints a pass line for every table it checked — 22 tables above.

## Supabase-only extensions register

Per the documented PGlite limitation, any migration using Supabase-only
extensions (pgsodium, supabase_vault, pg_net) must be recorded here. **Migrations
0000–0005 use none of them.** Nothing requires a deferred manual run against a
real Supabase project from STEP_00.

## Decisions recorded while making gates green

1. **PGlite multi-statement application.** PGlite's prepared-statement `query`
   rejects multiple commands; migration files and verifiers apply SQL through
   `db.exec` (and `client.query(sql)` under a real `DATABASE_URL`). Single-
   statement checks keep using parameterized `query`.
2. **Enum locality.** An enum type is created in the earliest migration that
   references it (`user_role_enum`, `admin_sub_role_enum` in 0001) and dropped in
   that same migration's `_down`, so down-order never breaks dependencies. 0002
   re-asserts shared value lists with `ALTER TYPE ... ADD VALUE IF NOT EXISTS`
   per playbook rule 4.5.
3. **Unique index over nullable `company_id`.** `NULLS NOT DISTINCT` (PG15+
   table-constraint syntax) is not portable in index form; `uq_idempotency_keys_scope`
   and `uq_webhook_processed_events_event` instead coalesce NULL to the sentinel
   uuid `00000000-0000-0000-0000-000000000000`, remain partial
   (`where deleted_at is null`), and writers use plain `on conflict do nothing`.
4. **Audit trigger before audit tables.** Core tables are audited from 0001 but
   audit tables exist from 0003; `audit_trigger()` skips cleanly when
   `audit_logs` / `audit_log_hash_chain` are absent (`to_regclass` check),
   which is exactly correct historically: logging starts when the audit system
   exists. All subsequent rows are hash-chained (proven by the gate proofs).
5. **RLS semantics of the named deny policy.** `deny_all_<table>` is PERMISSIVE
   with qual false (grants nothing; combined with RLS default-deny this seals the
   table until a step adds an explicit permissive policy). An earlier draft of
   CONTRACTS.md said `as restrictive`; a restrictive-false policy would deny even
   explicitly granted access. CONTRACTS.md section 1 was corrected accordingly
   and `apply_base_rls` documents the same.
6. **Superuser bypass in verification.** PGlite connects as the bootstrap
   superuser, which bypasses RLS even under FORCE. `verify-rls.mjs` therefore
   runs all assertions as a created non-superuser role `kd_verify_app`
   (nologin, noinherit, granted only DML on public tables), so the proofs
   exercise real policy evaluation.
7. **Guard hardening.** `check-migration-lint.sh` checks FK/unique-index rules
   statement-wise (definitions may span lines); `check-path-comment.sh` allows a
   shebang on line 1 with the path comment on line 2; `check-nav-integrity.sh`
   maps a lone route-group segment (`(public)/page.tsx`) to `/`;
   `check-english-only.sh` stays byte-strict — `lib/validation/sanitize.ts`
   carries its control-char classes as unicode escapes.

## What STEP_00 deliberately does not contain

No domain features (0 of 4,187 owned). Adapter interfaces are declaration-only:
`StorageAdapter` → built in STEP_13, `EmailAdapter` → STEP_03,
`GatewayAdapter` (16 processors) → STEP_07, `ApprovalEngine` → STEP_10.
The app shell renders placeholder layouts for `(public)`, `(dashboard)`,
`(admin)`, `(client-portal)` so the route map, middleware posture and nav
integrity guard have a real target; their visual composition lands in STEP_01.

## Handoff

- PR: `--base integration`, body = this file.
- After merge, tag the merge commit `foundation-v1` and announce Wave 1 may
  start (STEP_01 design system, then parallel Waves per the execution README).
