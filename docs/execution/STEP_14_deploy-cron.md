<!-- path: docs/execution/STEP_14_deploy-cron.md -->
# STEP_14 — Deploy, Cron, CI and Documentation

| | |
| --- | --- |
| Step | `STEP_14` |
| Wave | Wave 2 (parallel) |
| Branch | `kd/step-14-deploy-cron` (from `foundation-v1`, or `foundation-v2` for Wave 2) |
| Features owned | **158** |
| FEATURE_LIST.md lines | 4277-4301, 4303-4322, 4324-4343, 4345-4359, 4361-4375, 4377-4386, 4388-4397, 4399-4408, 4410-4424, 4426-4435, 4437-4441, 4443-4445 |
| Feature IDs | C-3451 - C-3608 |
| Migration range | `migrations/1400-1499` |
| Depends on | foundation-v2. |

Read before writing any code: `MASTER_PROMPT.md`, `IMPLEMENTATION_PLAN.md`,
`SPEC_CONFLICTS.md`, `docs/execution/README.md`, `docs/execution/CONTRACTS.md`,
`docs/execution/FILE_OWNERSHIP.md`, `docs/execution/STEP_FEATURES.md`.

---

## 1. Scope

Netlify deploy configuration and runtime constraints, Docker and VPS
self-hosting, the complete list of 20 cron jobs, CI quality gates, documentation and
governance, observability and incident response wiring, domain and email infrastructure,
customer lifecycle and offboarding, release and cost operations, final UX polish, and the
differentiator features.

Every one of the 158 features in the line range above is in scope. None may be skipped,
stubbed, or marked "Coming Soon". `docs/execution/STEP_FEATURES.md` is the authority on
which features are yours; if a feature is not in your line range, do not build it.

## 2. Batches

Work through these in order. Each batch ends with the exit gate green before the next
begins. Do not start a later batch while an earlier one is red.

1. `netlify.toml`, `netlify/functions/**`, scheduled functions, raw-body
   preservation for webhooks, edge versus node runtime mapping, cold-start reduction.
2. `Dockerfile`, `docker-compose.yml`, VPS notes, Netlify, Vercel and Docker parity
   checks in CI.
3. `config/cron/**` and `app/api/cron/**`: all 20 jobs, each with leader lock, timeout,
   idempotency window and failure alerting.
4. CI quality gates: lint, typecheck, build, guard scripts, SAST, DAST, SCA, secret
   scanning, container scanning, bundle budget, 320px check, dead-link audit.
5. Documentation: `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `docs/ERD.md`,
   `docs/adr/**`.
6. Observability: Sentry with PII scrubbing, uptime checks, structured dashboards,
   alert routing, incident runbooks.
7. Domain and email infrastructure: SPF, DKIM, DMARC, custom domains, TLS, DNSSEC notes.
8. Customer lifecycle: data export, offboarding, retention after cancellation.
9. Release and cost operations, final UX polish, PWA and service worker.

## 3. Database

`cron_jobs`, `cron_runs`, `cron_locks`, `deployments`, `incident_records`,
`offboarding_requests`.

Every table follows the base shape in `CONTRACTS.md` section 1: `id` (UUID v7),
`company_id`, `created_at`, `updated_at`, `deleted_at`, `version`, RLS enabled and forced,
a default-deny policy, explicit permissive policies, the audit trigger, the `updated_at`
trigger, `company_id` and `created_at` indexes, and partial unique constraints scoped to
`deleted_at is null`. Money columns are `numeric(18,4) not null`.

Every migration in `migrations/1400-1499` has a matching `_down.sql`. Migrations are
idempotent. Foreign keys are `on delete restrict`.

## 4. Contracts

Consumes the logger and error contracts for observability. Owns the final documentation
pass, including `README.md`, which no other step may edit.

## 5. Step notes

Netlify function limits are hard: 10 seconds synchronous, 26 seconds background, 6 MB
payload. Anything longer goes to the database-backed queue and a background function.

## 6. Files you own

See `docs/execution/FILE_OWNERSHIP.md`, section `STEP_14`. You may create and edit
only those paths. Everything else is read-only for you, including shared config, other
steps' directories and `FEATURE_LIST.md`.

Changes you need in a shared file go into `integrator/requests/step-14.json` in the
shape defined in `CONTRACTS.md` section 12. Never edit the shared file itself.

## 7. Exit gate

All of these must pass, and the output must be pasted into `STEP_14_COMPLETED.md`:

```
npm run typecheck
npm run lint
npm run build
npm run verify
npm run verify-db
npm run check-boundaries -- --step 14
```

Plus:

- `docs/feature-coverage.md` lists your 158 features as implemented, none skipped.
- No `any`, no `console.log`, no TODO or FIXME, no "Coming Soon", no test files.
- Every file starts with `// path: <its real path>`.
- Every mutation goes through `defineMutation`, so audit, idempotency and optimistic
  locking are applied.
- Every route goes through `defineRoute`, so validation, rate limiting, permission checks
  and correlation IDs are applied.
- Every page has loading, error, empty and success states, works at 320px, is keyboard
  accessible and supports dark mode.
- English only. USD only. No payment brand names.

## 8. Handoff

Create `STEP_14_COMPLETED.md` at the repository root containing:

1. Features implemented, listed by ID against your line range.
2. Files created and modified.
3. Migrations added, with their down migrations.
4. Dependencies and environment variables requested via `integrator/requests/step-14.json`.
5. Known issues and anything the integrator must wire by hand.
6. The exact command output of the exit gate.

Then:

```
git push -u origin kd/step-14-deploy-cron
gh pr create --base integration --head kd/step-14-deploy-cron \
  --title "STEP_14: Deploy, Cron, CI and Documentation" --body-file STEP_14_COMPLETED.md
```

Leave the PR as a draft. The integrator merges in numeric order.
