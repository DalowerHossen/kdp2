<!-- path: docs/execution/STEP_02_auth.md -->
# STEP_02 — Authentication

| | |
| --- | --- |
| Step | `STEP_02` |
| Wave | Wave 1 (sequential) |
| Branch | `kd/step-02-auth` (from `foundation-v1`, or `foundation-v2` for Wave 2) |
| Features owned | **40** |
| FEATURE_LIST.md lines | 556-557, 571-572, 581-590, 592-602, 604-618 |
| Feature IDs | 451-490 |
| Migration range | `migrations/0200-0299` |
| Depends on | STEP_01 merged. |

Read before writing any code: `MASTER_PROMPT.md`, `IMPLEMENTATION_PLAN.md`,
`SPEC_CONFLICTS.md`, `docs/execution/README.md`, `docs/execution/CONTRACTS.md`,
`docs/execution/FILE_OWNERSHIP.md`, `docs/execution/STEP_FEATURES.md`.

---

## 1. Scope

Supabase Auth with email and password, OAuth social login, TOTP two-factor
authentication, session management, login security, lockout, device sessions and revocation.

Every one of the 40 features in the line range above is in scope. None may be skipped,
stubbed, or marked "Coming Soon". `docs/execution/STEP_FEATURES.md` is the authority on
which features are yours; if a feature is not in your line range, do not build it.

## 2. Batches

Work through these in order. Each batch ends with the exit gate green before the next
begins. Do not start a later batch while an earlier one is red.

1. `lib/auth/session.ts`, `lib/auth/oauth.ts`, `lib/auth/two-factor.ts`.
2. `migrations/02xx_auth.sql` and its `_down.sql`: sessions, refresh tokens, TOTP secrets,
   recovery codes, login attempts, device fingerprints.
3. `app/api/auth/**` through `defineRoute`: login, logout, refresh, OAuth callback,
   enrol, verify, disable, recovery-code regeneration, session list and revoke.
4. `app/(auth)/**` pages: login, signup, forgot password, reset password, verify email,
   2FA challenge and enrolment.
5. Login security: rate limiting, exponential backoff, account lockout, impossible-travel
   signal to `STEP_15`'s fraud engine via the contract interface.
6. `middleware.ts` consumption: the session reader is exported for the integrator to wire.

## 3. Database

`auth_sessions`, `auth_totp_secrets`, `auth_recovery_codes`, `auth_login_attempts`,
`auth_devices`. All with the base shape, RLS, deny policy and audit trigger.

Every table follows the base shape in `CONTRACTS.md` section 1: `id` (UUID v7),
`company_id`, `created_at`, `updated_at`, `deleted_at`, `version`, RLS enabled and forced,
a default-deny policy, explicit permissive policies, the audit trigger, the `updated_at`
trigger, `company_id` and `created_at` indexes, and partial unique constraints scoped to
`deleted_at is null`. Money columns are `numeric(18,4) not null`.

Every migration in `migrations/0200-0299` has a matching `_down.sql`. Migrations are
idempotent. Foreign keys are `on delete restrict`.

## 4. Contracts

Consumes `defineRoute`, `AppError`, logger, rate limiter, network guard.
Provides `getSession()`, `requireActor()`, `ActorContext` resolution used by every later step.

## 5. Step notes

Two-factor is mandatory for `super_admin`, `ceo` and `admin_staff`, and enforceable per
tenant for `owner` and `staff`. Secrets are encrypted at rest with AES-256-GCM. Recovery
codes are hashed, never stored in plaintext.

## 6. Files you own

See `docs/execution/FILE_OWNERSHIP.md`, section `STEP_02`. You may create and edit
only those paths. Everything else is read-only for you, including shared config, other
steps' directories and `FEATURE_LIST.md`.

Changes you need in a shared file go into `integrator/requests/step-02.json` in the
shape defined in `CONTRACTS.md` section 12. Never edit the shared file itself.

## 7. Exit gate

All of these must pass, and the output must be pasted into `STEP_02_COMPLETED.md`:

```
npm run typecheck
npm run lint
npm run build
npm run verify
npm run verify-db
npm run check-boundaries -- --step 02
```

Plus:

- `docs/feature-coverage.md` lists your 40 features as implemented, none skipped.
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

Create `STEP_02_COMPLETED.md` at the repository root containing:

1. Features implemented, listed by ID against your line range.
2. Files created and modified.
3. Migrations added, with their down migrations.
4. Dependencies and environment variables requested via `integrator/requests/step-02.json`.
5. Known issues and anything the integrator must wire by hand.
6. The exact command output of the exit gate.

Then:

```
git push -u origin kd/step-02-auth
gh pr create --base integration --head kd/step-02-auth \
  --title "STEP_02: Authentication" --body-file STEP_02_COMPLETED.md
```

Leave the PR as a draft. The integrator merges in numeric order.
