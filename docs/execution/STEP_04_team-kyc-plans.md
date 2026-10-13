<!-- path: docs/execution/STEP_04_team-kyc-plans.md -->
# STEP_04 — Team, KYC, Notifications and Plans

| | |
| --- | --- |
| Step | `STEP_04` |
| Wave | Wave 1 (sequential) |
| Branch | `kd/step-04-team-kyc-plans` (from `foundation-v1`, or `foundation-v2` for Wave 2) |
| Features owned | **109** |
| FEATURE_LIST.md lines | 785-798, 800-811, 813-819, 823-833, 837-844, 846-852, 854-867, 871-879, 881-891, 893-900, 902-909 |
| Feature IDs | 624-732 |
| Migration range | `migrations/0400-0499` |
| Depends on | STEP_03 merged. |

Read before writing any code: `MASTER_PROMPT.md`, `IMPLEMENTATION_PLAN.md`,
`SPEC_CONFLICTS.md`, `docs/execution/README.md`, `docs/execution/CONTRACTS.md`,
`docs/execution/FILE_OWNERSHIP.md`, `docs/execution/STEP_FEATURES.md`.

---

## 1. Scope

Owner-to-staff team management with granular permissions, staff activity
monitoring, staff security controls, KYC document upload and review, the notification
centre, plan management, subscription lifecycle, coupons and the entitlement engine.

Every one of the 109 features in the line range above is in scope. None may be skipped,
stubbed, or marked "Coming Soon". `docs/execution/STEP_FEATURES.md` is the authority on
which features are yours; if a feature is not in your line range, do not build it.

## 2. Batches

Work through these in order. Each batch ends with the exit gate green before the next
begins. Do not start a later batch while an earlier one is red.

1. `services/team-service.ts` and `app/(dashboard)/team/**`: invite, accept, roles,
   granular permissions, suspend, remove, activity log.
2. `services/kyc-service.ts` and `app/(dashboard|admin)/kyc`: document upload through the
   storage contract, review queue, status transitions, expiry tracking.
3. `services/notification-service.ts` and the notification centre: in-app, email and
   event-driven rules.
4. `services/plan-service.ts`: plans, limits, subscriptions, upgrades, downgrades,
   cancellations, coupons, trials.
5. Entitlement engine: `lib/contracts/entitlement.ts` consumption, plan gating helper used
   by every later step.
6. `migrations/04xx_team_kyc_plans.sql` and `_down.sql`.

## 3. Database

`team_invites`, `team_members`, `staff_permissions`, `staff_activity`,
`kyc_submissions`, `kyc_documents`, `kyc_reviews`, `notifications`,
`notification_preferences`, `plans`, `plan_limits`, `subscriptions`, `coupons`,
`entitlements`.

Every table follows the base shape in `CONTRACTS.md` section 1: `id` (UUID v7),
`company_id`, `created_at`, `updated_at`, `deleted_at`, `version`, RLS enabled and forced,
a default-deny policy, explicit permissive policies, the audit trigger, the `updated_at`
trigger, `company_id` and `created_at` indexes, and partial unique constraints scoped to
`deleted_at is null`. Money columns are `numeric(18,4) not null`.

Every migration in `migrations/0400-0499` has a matching `_down.sql`. Migrations are
idempotent. Foreign keys are `on delete restrict`.

## 4. Contracts

Consumes storage and email contracts. Provides `hasEntitlement(companyId, key)` which
later steps call to gate premium features. Never reimplement plan checks locally.

## 5. Step notes

KYC documents are encrypted at rest and access is audited on every read. Review actions
require the `kyc_reviewer` sub-role and an approval level from the approval engine.

## 6. Files you own

See `docs/execution/FILE_OWNERSHIP.md`, section `STEP_04`. You may create and edit
only those paths. Everything else is read-only for you, including shared config, other
steps' directories and `FEATURE_LIST.md`.

Changes you need in a shared file go into `integrator/requests/step-04.json` in the
shape defined in `CONTRACTS.md` section 12. Never edit the shared file itself.

## 7. Exit gate

All of these must pass, and the output must be pasted into `STEP_04_COMPLETED.md`:

```
npm run typecheck
npm run lint
npm run build
npm run verify
npm run verify-db
npm run check-boundaries -- --step 04
```

Plus:

- `docs/feature-coverage.md` lists your 109 features as implemented, none skipped.
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

Create `STEP_04_COMPLETED.md` at the repository root containing:

1. Features implemented, listed by ID against your line range.
2. Files created and modified.
3. Migrations added, with their down migrations.
4. Dependencies and environment variables requested via `integrator/requests/step-04.json`.
5. Known issues and anything the integrator must wire by hand.
6. The exact command output of the exit gate.

Then:

```
git push -u origin kd/step-04-team-kyc-plans
gh pr create --base integration --head kd/step-04-team-kyc-plans \
  --title "STEP_04: Team, KYC, Notifications and Plans" --body-file STEP_04_COMPLETED.md
```

Leave the PR as a draft. The integrator merges in numeric order.
