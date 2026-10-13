<!-- path: docs/execution/STEP_03_smtp-onboarding.md -->
# STEP_03 — Universal SMTP, Onboarding and Settings

| | |
| --- | --- |
| Step | `STEP_03` |
| Wave | Wave 1 (sequential) |
| Branch | `kd/step-03-smtp-onboarding` (from `foundation-v1`, or `foundation-v2` for Wave 2) |
| Features owned | **133** |
| FEATURE_LIST.md lines | 622-631, 633-649, 651-662, 664-674, 678-694, 696-711, 713-728, 732-743, 745, 751-752, 761-763, 765-770, 772-781 |
| Feature IDs | 491-623 |
| Migration range | `migrations/0300-0399` |
| Depends on | STEP_02 merged. |

Read before writing any code: `MASTER_PROMPT.md`, `IMPLEMENTATION_PLAN.md`,
`SPEC_CONFLICTS.md`, `docs/execution/README.md`, `docs/execution/CONTRACTS.md`,
`docs/execution/FILE_OWNERSHIP.md`, `docs/execution/STEP_FEATURES.md`.

---

## 1. Scope

Universal SMTP with pluggable providers at platform and tenant level, email
deliverability, the signup flow, the company onboarding wizard with industry presets,
first-run experience, company profile, branding settings, invoice settings and tenant
preferences.

Every one of the 133 features in the line range above is in scope. None may be skipped,
stubbed, or marked "Coming Soon". `docs/execution/STEP_FEATURES.md` is the authority on
which features are yours; if a feature is not in your line range, do not build it.

## 2. Batches

Work through these in order. Each batch ends with the exit gate green before the next
begins. Do not start a later batch while an earlier one is red.

1. `lib/email/adapters/**` for resend, sendgrid, ses, mailgun, postmark and generic SMTP,
   all implementing `EmailAdapter`.
2. `lib/email/queue.ts` with `FOR UPDATE SKIP LOCKED` claiming, retry with backoff, and
   `lib/email/deliverability.ts` for bounce, complaint and unsubscribe handling.
3. `lib/email/template-engine.ts` plus the base template set, English only, with a
   plain-text multipart alternative for every template.
4. `migrations/03xx_email_settings.sql`: smtp configs (platform and tenant, secrets
   encrypted), email logs, email templates, suppression list, domain verification.
5. `app/(dashboard)/settings/**` and `app/api/settings/**`: company profile, branding,
   invoice defaults, preferences.
6. `app/(dashboard)/onboarding/**` and `components/onboarding/**`: the wizard, industry
   presets, first-run checklist.

## 3. Database

`smtp_configs`, `email_templates`, `email_logs`, `email_suppressions`,
`email_domains`, `company_profiles`, `company_branding`, `onboarding_progress`.

Every table follows the base shape in `CONTRACTS.md` section 1: `id` (UUID v7),
`company_id`, `created_at`, `updated_at`, `deleted_at`, `version`, RLS enabled and forced,
a default-deny policy, explicit permissive policies, the audit trigger, the `updated_at`
trigger, `company_id` and `created_at` indexes, and partial unique constraints scoped to
`deleted_at is null`. Money columns are `numeric(18,4) not null`.

Every migration in `migrations/0300-0399` has a matching `_down.sql`. Migrations are
idempotent. Foreign keys are `on delete restrict`.

## 4. Contracts

Implements `EmailAdapter` and `EmailQueue` from CONTRACTS.md section 8. Every later step
sends mail through this queue and never inline.

## 5. Step notes

Provider credentials are encrypted with AES-256-GCM and never returned to the client in
plaintext. Tenant SMTP overrides platform SMTP when configured and healthy, with automatic
fallback.

## 6. Files you own

See `docs/execution/FILE_OWNERSHIP.md`, section `STEP_03`. You may create and edit
only those paths. Everything else is read-only for you, including shared config, other
steps' directories and `FEATURE_LIST.md`.

Changes you need in a shared file go into `integrator/requests/step-03.json` in the
shape defined in `CONTRACTS.md` section 12. Never edit the shared file itself.

## 7. Exit gate

All of these must pass, and the output must be pasted into `STEP_03_COMPLETED.md`:

```
npm run typecheck
npm run lint
npm run build
npm run verify
npm run verify-db
npm run check-boundaries -- --step 03
```

Plus:

- `docs/feature-coverage.md` lists your 133 features as implemented, none skipped.
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

Create `STEP_03_COMPLETED.md` at the repository root containing:

1. Features implemented, listed by ID against your line range.
2. Files created and modified.
3. Migrations added, with their down migrations.
4. Dependencies and environment variables requested via `integrator/requests/step-03.json`.
5. Known issues and anything the integrator must wire by hand.
6. The exact command output of the exit gate.

Then:

```
git push -u origin kd/step-03-smtp-onboarding
gh pr create --base integration --head kd/step-03-smtp-onboarding \
  --title "STEP_03: Universal SMTP, Onboarding and Settings" --body-file STEP_03_COMPLETED.md
```

Leave the PR as a draft. The integrator merges in numeric order.
