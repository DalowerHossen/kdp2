<!-- path: docs/execution/STEP_00_foundation.md -->
# STEP_00 — Foundation and Governance

| | |
| --- | --- |
| Step | `STEP_00` |
| Wave | Wave 0 — runs alone, before everything |
| Branch | `kd/step-00-foundation` (from `main`) |
| Features owned | **0** from `FEATURE_LIST.md` — this step builds the ground the other 4,187 stand on |
| Migration range | `migrations/0000`–`migrations/0099` |
| Depends on | Nothing |
| Blocks | Every other step |

Nothing else can be verified, and no other step can start, until this step is merged and
tagged `foundation-v1`. Take the time to get it right; fourteen other steps inherit every
decision made here.

---

## 1. Why this step exists

Fourteen chats will build this platform in parallel. That only works if the primitives
they share already exist and are fixed: the money type, the error classes, the HTTP
wrapper, the logger, the storage and email interfaces, the base table shape, the RLS
convention, the audit trigger, the guard scripts and the migration runner.

If `STEP_00` does not build them, each of the fourteen steps invents its own version, and
the result is fourteen incompatible copies of the same primitive. This step exists to make
that impossible.

## 2. Batches

### Batch 1 — Toolchain and repository scaffold

```
package.json  package-lock.json  tsconfig.json  tailwind.config.ts  postcss.config.ts
next.config.mjs  .eslintrc.json  .prettierrc.json  .editorconfig  .gitignore
.env.example  components.json  netlify.toml  Dockerfile  docker-compose.yml
.husky/pre-commit  .husky/commit-msg
.github/workflows/ci.yml  deploy.yml  security.yml
.github/CODEOWNERS  .github/pull_request_template.md
```

`tsconfig.json` sets `strict`, `noImplicitAny`, `strictNullChecks`, `noUnusedLocals`,
`noUnusedParameters`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, and path
aliases `@/*`. ESLint bans `@typescript-eslint/no-explicit-any` and `no-console` as
errors.

Create the empty directory tree from `MASTER_PROMPT.md` lines 256–650 so every step has
its folder already present.

### Batch 2 — Guard scripts

All of these live in `scripts/` and are wired to `npm run verify`:

| Script | Enforces |
| --- | --- |
| `check-english-only.sh` | Rule 1. No non-ASCII in `app/ components/ lib/ services/ config/ migrations/ scripts/` |
| `check-money-types.sh` | Rule 2. No `number` on any monetary identifier in `lib/ services/ app/api/` |
| `check-path-comment.sh` | Rule 8. Line 1 is `// path: <real path>` and the path matches the file location |
| `check-forbidden-tokens.sh` | Rules 5 and 7. No TODO, FIXME, "Coming Soon", lorem, placeholder |
| `check-no-test-files.sh` | Rule 4. No `.test.ts`, `.spec.ts`, `tests/`, `__tests__/` |
| `check-forbidden-brands.sh` | Rule 18. No payment brand names anywhere |
| `check-migration-lint.sh` | Rules 9, 10, 11. No float money, every table has base columns, RLS, deny policy, audit trigger |
| `check-nav-integrity.sh` | Every route registered in the nav map, no dead links |
| `check-step-boundaries.sh` | Section 4.2 of the playbook. No writes outside the step's owned paths |
| `check-feature-coverage.sh` | Every feature in the manifest is implemented exactly once |
| `build-feature-manifest.mjs` | Generates `docs/feature-manifest.json` from `FEATURE_LIST.md` |
| `migrate.mjs` | Ordered, idempotent migration runner with a checksum ledger |
| `migrate-down.mjs` | Rollback runner |
| `verify-db.mjs` | Runs every migration against PGlite, then asserts the table invariants |
| `verify-rls.mjs` | Proves default-deny and cross-tenant isolation |

`npm run verify` runs all of them and prints which ones ran and what each returned.

### Batch 3 — Contracts

Create `lib/contracts/**` exactly as specified in `docs/execution/CONTRACTS.md`:
`money.ts`, `errors.ts`, `http.ts`, `service.ts`, `auth.ts`, `storage.ts`, `email.ts`,
`payment.ts`, `logger.ts`, `nav.ts`, `cron.ts`, `entitlement.ts`.

Then the implementations those contracts promise:

```
lib/money/**        decimal.js value type, tax, rounding, currency, allocation
lib/errors/**       AppError and its subclasses, error mapping
lib/logger/**       structured JSON logger, correlation ID, PII scrub
lib/http/**         defineRoute, rate limit, idempotency, csrf, csp, correlation
lib/validation/**   schema registry, primitives, sanitize
lib/db/**           typed query helper, parameterized only, cursor pagination, timeouts
lib/supabase/**     client, server, admin, middleware, rls-helpers
config/constants.ts  config/design-tokens.json
```

### Batch 4 — Migrations

```
migrations/0000_extensions.sql      uuid_generate_v7, set_updated_at, audit_trigger,
                                    soft-delete helper, default-deny helper
migrations/0001_platform_core.sql   companies, users, memberships, roles,
                                    admin_sub_roles, permissions, role_permissions
migrations/0002_enums.sql           every shared enum with its full value list
migrations/0003_audit.sql           audit_logs (append-only, UPDATE and DELETE revoked),
                                    audit_log_hash_chain
migrations/0004_security.sql        ip_reputation, device_fingerprints, sessions,
                                    login_attempts, rate_limit_buckets,
                                    idempotency_keys, webhook_processed_events
migrations/0005_plans.sql           plans, plan_limits, subscriptions, entitlements,
                                    coupons
```

Each with its `_down.sql`. Enums are created here, once, in full, because Postgres enums
cannot be merged from parallel branches.

`migrations/0002_enums.sql` must already contain every value any later step needs,
including `payment_status_enum`, `invoice_status_enum`, `kyc_status_enum`,
`payout_status_enum`, `approval_status_enum`, `file_category_enum`, `role_enum` and
`admin_sub_role_enum`. Derive the lists from `FEATURE_LIST.md` before writing it; a later
step adding a value is allowed but is a merge risk, so be generous here.

### Batch 5 — Shared application files

```
middleware.ts              session read, network guard, CSP nonce, correlation ID
app/layout.tsx             root layout, font loading, theme provider, error boundary
app/globals.css            design tokens as CSS custom properties
app/not-found.tsx  app/error.tsx  app/global-error.tsx  app/loading.tsx
config/nav-map.ts          glob-imports config/nav/**, builds sidebar, breadcrumbs,
                           command palette source and the dead-link audit
```

The four layout shells — `app/(dashboard)/layout.tsx`, `app/(admin)/layout.tsx`,
`app/(client-portal)/layout.tsx`, `app/(public)/layout.tsx` — are created here as minimal
working shells. `STEP_01` fills them in.

### Batch 6 — Verification harness

`scripts/verify-db.mjs` runs every migration up and then down against
`@electric-sql/pglite`, real PostgreSQL compiled to WebAssembly, installed from npmjs.
After applying, it asserts for every table:

- the five base columns and `version` exist
- `row level security` is enabled
- a default-deny policy exists
- the audit trigger is attached
- `company_id` and `created_at` indexes exist
- every money column is `numeric(18,4)`

It prints the per-table result and exits non-zero on any failure.

`scripts/verify-rls.mjs` inserts rows for two tenants, sets the role and
`app.company_id` for each, and proves that a cross-tenant read returns zero rows.

Documented limitation: Supabase-only extensions such as `pgsodium`, `supabase_vault` and
`pg_net` are not present in PGlite. Any migration using them is additionally checked by
`check-migration-lint.sh` and must be recorded in `STEP_00_COMPLETED.md` as requiring a
manual run against a real Supabase project.

### Batch 7 — Feature manifest

`scripts/build-feature-manifest.mjs` parses `FEATURE_LIST.md` and writes
`docs/feature-manifest.json`:

```json
{
  "id": 4030,
  "printedId": 3451,
  "region": "C",
  "line": 4277,
  "slug": "netlify-deploy-config",
  "text": "Netlify deploy configuration (netlify.toml)",
  "step": "14",
  "part": 10,
  "implemented": false
}
```

Renumbering rule, from decision C2: regions A, B and D keep their printed ID. Region C
(lines 4277–4445, printed IDs 3451–3608) maps to printed ID + 579, giving 4030–4187. The
script prints the renumbering map it applied and fails if any feature is unassigned or
assigned to two steps.

`FEATURE_LIST.md` is never edited.

## 3. Database

Only the five migrations in batch 4. Every table follows `CONTRACTS.md` section 1.
`audit_logs` additionally has `UPDATE` and `DELETE` revoked at the database level, and a
hash chain column so silent edits are detectable.

## 4. Contracts

This step **defines** every contract in `docs/execution/CONTRACTS.md` and implements the
shared ones: money, errors, logger, HTTP, validation, database access, Supabase clients.

It declares but does not implement: `StorageAdapter`, `EmailAdapter`, `GatewayAdapter`,
`ApprovalEngine`. Those are implemented by `STEP_13`, `STEP_03`, `STEP_07` and `STEP_10`
respectively, against the interfaces created here.

## 5. Step notes

- After this step merges to `integration`, tag it: `git tag foundation-v1 && git push origin foundation-v1`.
  Every Wave 1 step branches from that tag.
- After `STEP_05` merges, the integrator retags `foundation-v2`, and all Wave 2 branches
  rebase onto it.
- `scripts/**`, `lib/contracts/**`, `lib/money/**`, `lib/logger/**`, `lib/errors/**`,
  `lib/http/**`, `lib/validation/**`, `lib/db/**`, `lib/supabase/**`, the shared config
  files and `middleware.ts` become **integrator-owned and read-only** once `foundation-v1`
  is tagged.
- Do not implement domain features here. If you find yourself writing an invoice or a
  payment, stop — it belongs to another step.

## 6. Files you own

Everything, during this step only. After `foundation-v1` is tagged, ownership narrows to
nothing and the integrator takes over the shared surface.

## 7. Exit gate

```
npm install
npm run typecheck
npm run lint
npm run build
npm run verify
npm run verify-db
npm run verify-rls
node scripts/build-feature-manifest.mjs
```

All must exit 0. Additionally prove:

- `docs/feature-manifest.json` contains exactly **4,187** records.
- The per-step counts read 450, 40, 133, 109, 145, 499, 390, 325, 323, 499, 264, 273, 158,
  158, 421 and sum to 4,187.
- Printed IDs 3451–3608 appear exactly twice in the source and exactly once each as
  canonical IDs in the manifest.
- `npm run verify` names every guard script it executed.
- `verify-db` prints a pass line for every table it checked.

Paste all of it into `STEP_00_COMPLETED.md`.

## 8. Handoff

`STEP_00_COMPLETED.md` at the repository root, then:

```
git push -u origin kd/step-00-foundation
gh pr create --base integration --head kd/step-00-foundation \
  --title "STEP_00: Foundation and governance" --body-file STEP_00_COMPLETED.md
```

After merge: tag `foundation-v1` and announce that Wave 1 may start.
