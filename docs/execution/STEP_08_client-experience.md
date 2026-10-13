<!-- path: docs/execution/STEP_08_client-experience.md -->
# STEP_08 — Client Experience

| | |
| --- | --- |
| Step | `STEP_08` |
| Wave | Wave 2 (parallel) |
| Branch | `kd/step-08-client-experience` (from `foundation-v1`, or `foundation-v2` for Wave 2) |
| Features owned | **325** |
| FEATURE_LIST.md lines | 2128-2136, 2138-2143, 2145-2155, 2157-2164, 2168-2177, 2179-2191, 2193-2197, 2201-2209, 2211-2218, 2222-2233, 2235-2242, 2246-2255, 2257-2264, 2266-2272, 2274-2283, 2287-2294, 2298-2304, 2308-2314, 23 ... (full list in STEP_FEATURES.md) |
| Feature IDs | 1767-2091 |
| Migration range | `migrations/0800-0899` |
| Depends on | foundation-v2. |

Read before writing any code: `MASTER_PROMPT.md`, `IMPLEMENTATION_PLAN.md`,
`SPEC_CONFLICTS.md`, `docs/execution/README.md`, `docs/execution/CONTRACTS.md`,
`docs/execution/FILE_OWNERSHIP.md`, `docs/execution/STEP_FEATURES.md`.

---

## 1. Scope

Tokenized login-free client access with HMAC links, invoice view, payment page,
estimate approval, receipt view, client hub, contract signing, expired and invalid token
handling, the client email journey, tenant branding, white-label tier, custom domains,
document integrity and e-sign evidence.

Every one of the 325 features in the line range above is in scope. None may be skipped,
stubbed, or marked "Coming Soon". `docs/execution/STEP_FEATURES.md` is the authority on
which features are yours; if a feature is not in your line range, do not build it.

## 2. Batches

Work through these in order. Each batch ends with the exit gate green before the next
begins. Do not start a later batch while an earlier one is red.

1. `lib/portal/token.ts`: HMAC signing, expiry, single-use flags, scope binding,
   revocation, constant-time comparison.
2. `app/(client-portal)/{i,e,r,hub,c}/[token]/**`: invoice view, payment, estimate
   approval, receipt, hub, contract signing.
3. Expired, revoked and tampered token pages with clear English messaging.
4. `services/email-journey-service.ts`: reminder schedules, before and after due date,
   escalation, per-tenant templates, open and click tracking, suppression handling.
5. `services/branding-service.ts`: per-tenant logo, colours, typography, email footer,
   white-label removal of platform marks, custom domain binding.
6. Document integrity: content hash on every published document, tamper evidence,
   e-sign capture with IP, user agent and timestamp.
7. `app/api/portal/**` through `defineRoute` with token-scoped authorization.

## 3. Database

`portal_tokens`, `portal_token_scopes`, `portal_access_logs`,
`email_journeys`, `email_journey_steps`, `document_publications`,
`document_signatures`, `tenant_domains`.

Every table follows the base shape in `CONTRACTS.md` section 1: `id` (UUID v7),
`company_id`, `created_at`, `updated_at`, `deleted_at`, `version`, RLS enabled and forced,
a default-deny policy, explicit permissive policies, the audit trigger, the `updated_at`
trigger, `company_id` and `created_at` indexes, and partial unique constraints scoped to
`deleted_at is null`. Money columns are `numeric(18,4) not null`.

Every migration in `migrations/0800-0899` has a matching `_down.sql`. Migrations are
idempotent. Foreign keys are `on delete restrict`.

## 4. Contracts

Consumes `PaymentService`, `InvoiceService`, email queue, branding. Provides the client
facing surface; no other step renders client-portal pages.

## 5. Step notes

Tokens are the client's only credential. They are HMAC-bound to the document, expire,
and are revocable. No client role and no client login exist. Every token access is logged
with IP verdict from the network guard.

## 6. Files you own

See `docs/execution/FILE_OWNERSHIP.md`, section `STEP_08`. You may create and edit
only those paths. Everything else is read-only for you, including shared config, other
steps' directories and `FEATURE_LIST.md`.

Changes you need in a shared file go into `integrator/requests/step-08.json` in the
shape defined in `CONTRACTS.md` section 12. Never edit the shared file itself.

## 7. Exit gate

All of these must pass, and the output must be pasted into `STEP_08_COMPLETED.md`:

```
npm run typecheck
npm run lint
npm run build
npm run verify
npm run verify-db
npm run check-boundaries -- --step 08
```

Plus:

- `docs/feature-coverage.md` lists your 325 features as implemented, none skipped.
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

Create `STEP_08_COMPLETED.md` at the repository root containing:

1. Features implemented, listed by ID against your line range.
2. Files created and modified.
3. Migrations added, with their down migrations.
4. Dependencies and environment variables requested via `integrator/requests/step-08.json`.
5. Known issues and anything the integrator must wire by hand.
6. The exact command output of the exit gate.

Then:

```
git push -u origin kd/step-08-client-experience
gh pr create --base integration --head kd/step-08-client-experience \
  --title "STEP_08: Client Experience" --body-file STEP_08_COMPLETED.md
```

Leave the PR as a draft. The integrator merges in numeric order.
