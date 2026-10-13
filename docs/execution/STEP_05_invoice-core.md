<!-- path: docs/execution/STEP_05_invoice-core.md -->
# STEP_05 — Gateway Settings and Invoice Core

| | |
| --- | --- |
| Step | `STEP_05` |
| Wave | Wave 1 (sequential) |
| Branch | `kd/step-05-invoice-core` (from `foundation-v1`, or `foundation-v2` for Wave 2) |
| Features owned | **145** |
| FEATURE_LIST.md lines | 913-926, 928-932, 936-944, 948-953, 956-967, 969-982, 984-999, 1001-1008, 1010-1026, 1028-1039, 1043-1059, 1061-1068, 1070-1076 |
| Feature IDs | 733-877 |
| Migration range | `migrations/0500-0599` |
| Depends on | STEP_04 merged. |

Read before writing any code: `MASTER_PROMPT.md`, `IMPLEMENTATION_PLAN.md`,
`SPEC_CONFLICTS.md`, `docs/execution/README.md`, `docs/execution/CONTRACTS.md`,
`docs/execution/FILE_OWNERSHIP.md`, `docs/execution/STEP_FEATURES.md`.

---

## 1. Scope

Tenant gateway configuration and encrypted key storage, tenant security policy,
invoice CRUD, dynamic line items, gapless invoice numbering, invoice statuses and workflow,
invoice metadata, drafts, sends, voids and the approval requirement for sending.

Every one of the 145 features in the line range above is in scope. None may be skipped,
stubbed, or marked "Coming Soon". `docs/execution/STEP_FEATURES.md` is the authority on
which features are yours; if a feature is not in your line range, do not build it.

## 2. Batches

Work through these in order. Each batch ends with the exit gate green before the next
begins. Do not start a later batch while an earlier one is red.

1. `services/gateway-settings-service.ts` and `app/api/gateways/settings/**`: per-tenant
   gateway credentials, encrypted, with connection testing.
2. Tenant security policy: password rules, mandatory 2FA for staff, IP allowlist, session
   lifetime.
3. `migrations/05xx_invoices.sql`: invoices, invoice line items, invoice status history,
   numbering sequences, taxes, duplicate-check hashes.
4. `services/numbering-service.ts`: gapless per-tenant numbering under
   `pg_advisory_xact_lock`, with prefixes per document type.
5. `services/invoice-service.ts`: create, read, update with optimistic locking, soft
   delete, status transitions, duplicate detection, audit on every mutation.
6. `app/(dashboard)/invoices/**` and `app/api/invoices/**`: list with cursor pagination,
   detail, editor with dynamic line items, bulk actions.

## 3. Database

`gateway_configs`, `tenant_security_policies`, `invoices`, `invoice_items`,
`invoice_status_history`, `numbering_sequences`, `tax_rates`.

Every table follows the base shape in `CONTRACTS.md` section 1: `id` (UUID v7),
`company_id`, `created_at`, `updated_at`, `deleted_at`, `version`, RLS enabled and forced,
a default-deny policy, explicit permissive policies, the audit trigger, the `updated_at`
trigger, `company_id` and `created_at` indexes, and partial unique constraints scoped to
`deleted_at is null`. Money columns are `numeric(18,4) not null`.

Every migration in `migrations/0500-0599` has a matching `_down.sql`. Migrations are
idempotent. Foreign keys are `on delete restrict`.

## 4. Contracts

Consumes `defineMutation`, money, storage, email. Provides `InvoiceService` which
`STEP_06` (PDF, estimates) and `STEP_07` (payments against invoices) consume through the
contract interface only.

## 5. Step notes

Invoice totals are computed with the money type only. Numbering must be gapless and
concurrency-safe; the advisory lock is per tenant and per document type, never global.

## 6. Files you own

See `docs/execution/FILE_OWNERSHIP.md`, section `STEP_05`. You may create and edit
only those paths. Everything else is read-only for you, including shared config, other
steps' directories and `FEATURE_LIST.md`.

Changes you need in a shared file go into `integrator/requests/step-05.json` in the
shape defined in `CONTRACTS.md` section 12. Never edit the shared file itself.

## 7. Exit gate

All of these must pass, and the output must be pasted into `STEP_05_COMPLETED.md`:

```
npm run typecheck
npm run lint
npm run build
npm run verify
npm run verify-db
npm run check-boundaries -- --step 05
```

Plus:

- `docs/feature-coverage.md` lists your 145 features as implemented, none skipped.
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

Create `STEP_05_COMPLETED.md` at the repository root containing:

1. Features implemented, listed by ID against your line range.
2. Files created and modified.
3. Migrations added, with their down migrations.
4. Dependencies and environment variables requested via `integrator/requests/step-05.json`.
5. Known issues and anything the integrator must wire by hand.
6. The exact command output of the exit gate.

Then:

```
git push -u origin kd/step-05-invoice-core
gh pr create --base integration --head kd/step-05-invoice-core \
  --title "STEP_05: Gateway Settings and Invoice Core" --body-file STEP_05_COMPLETED.md
```

Leave the PR as a draft. The integrator merges in numeric order.
