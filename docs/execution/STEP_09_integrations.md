<!-- path: docs/execution/STEP_09_integrations.md -->
# STEP_09 — Integrations and Public API

| | |
| --- | --- |
| Step | `STEP_09` |
| Wave | Wave 2 (parallel) |
| Branch | `kd/step-09-integrations` (from `foundation-v1`, or `foundation-v2` for Wave 2) |
| Features owned | **323** |
| FEATURE_LIST.md lines | 2512-2522, 2526-2535, 2537-2559, 2561-2575, 2577-2584, 2586-2606, 2610-2621, 2623-2626, 2628-2634, 2636-2648, 2652-2659, 2661-2665, 2667-2677, 2681-2691, 2693-2698, 2702-2712, 2714-2726, 2730-2739, 27 ... (full list in STEP_FEATURES.md) |
| Feature IDs | 2092-2414 |
| Migration range | `migrations/0900-0999` |
| Depends on | foundation-v2. |

Read before writing any code: `MASTER_PROMPT.md`, `IMPLEMENTATION_PLAN.md`,
`SPEC_CONFLICTS.md`, `docs/execution/README.md`, `docs/execution/CONTRACTS.md`,
`docs/execution/FILE_OWNERSHIP.md`, `docs/execution/STEP_FEATURES.md`.

---

## 1. Scope

WhatsApp automation on Meta Cloud API, social media automation across seven
platforms, the public REST API v1 with keys and scopes, inbound and outbound webhooks,
Zapier, Make and the browser extension surface, bank feed ingestion, receipt OCR,
contracts and e-signature, and multi-channel messaging.

Every one of the 323 features in the line range above is in scope. None may be skipped,
stubbed, or marked "Coming Soon". `docs/execution/STEP_FEATURES.md` is the authority on
which features are yours; if a feature is not in your line range, do not build it.

## 2. Batches

Work through these in order. Each batch ends with the exit gate green before the next
begins. Do not start a later batch while an earlier one is red.

1. `lib/whatsapp/**`: Meta Cloud API client, template registry, campaign runner,
   consent and compliance tracking, inbound webhook verification.
2. `lib/social/adapters/**`: facebook, instagram, linkedin, x, threads, telegram,
   pinterest; connection, composer, scheduler, auto-post rules, evergreen queue, approval
   flow, post analytics.
3. `app/api/public/v1/**`: API keys, hashed at rest, scopes, per-key rate limits,
   cursor pagination, OpenAPI document.
4. `services/webhook-service.ts`: outbound webhooks with HMAC signing, exponential retry,
   delivery log, endpoint health, developer portal.
5. `lib/bank-feed/**`: Plaid and Salt Edge adapters, transaction import, smart
   reconciliation suggestions.
6. `lib/ocr/**`: Google Cloud Vision receipt scanning with structured extraction.
7. `lib/esignature/**`: contract templates, signing flow, evidence pack.
8. `services/messaging-service.ts`: unified multi-channel inbox and campaigns.

## 3. Database

`integrations`, `integration_credentials`, `api_keys`, `api_key_scopes`,
`api_request_logs`, `outbound_webhooks`, `webhook_endpoints`, `webhook_deliveries`,
`whatsapp_templates`, `whatsapp_messages`, `whatsapp_consents`, `social_accounts`,
`social_posts`, `social_schedules`, `bank_connections`, `bank_transactions`,
`receipt_scans`, `contracts`, `contract_signatures`, `messages`, `conversations`.

Every table follows the base shape in `CONTRACTS.md` section 1: `id` (UUID v7),
`company_id`, `created_at`, `updated_at`, `deleted_at`, `version`, RLS enabled and forced,
a default-deny policy, explicit permissive policies, the audit trigger, the `updated_at`
trigger, `company_id` and `created_at` indexes, and partial unique constraints scoped to
`deleted_at is null`. Money columns are `numeric(18,4) not null`.

Every migration in `migrations/0900-0999` has a matching `_down.sql`. Migrations are
idempotent. Foreign keys are `on delete restrict`.

## 4. Contracts

Consumes storage, email, payment and invoice services through contracts. Provides the
public API surface; `STEP_10` links to it from the admin console but does not own it.

## 5. Step notes

Every integration credential is AES-256-GCM encrypted. Public API keys are stored as
hashes with a one-time plaintext reveal. Outbound webhooks are signed and replay-protected
with a timestamp window.

## 6. Files you own

See `docs/execution/FILE_OWNERSHIP.md`, section `STEP_09`. You may create and edit
only those paths. Everything else is read-only for you, including shared config, other
steps' directories and `FEATURE_LIST.md`.

Changes you need in a shared file go into `integrator/requests/step-09.json` in the
shape defined in `CONTRACTS.md` section 12. Never edit the shared file itself.

## 7. Exit gate

All of these must pass, and the output must be pasted into `STEP_09_COMPLETED.md`:

```
npm run typecheck
npm run lint
npm run build
npm run verify
npm run verify-db
npm run check-boundaries -- --step 09
```

Plus:

- `docs/feature-coverage.md` lists your 323 features as implemented, none skipped.
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

Create `STEP_09_COMPLETED.md` at the repository root containing:

1. Features implemented, listed by ID against your line range.
2. Files created and modified.
3. Migrations added, with their down migrations.
4. Dependencies and environment variables requested via `integrator/requests/step-09.json`.
5. Known issues and anything the integrator must wire by hand.
6. The exact command output of the exit gate.

Then:

```
git push -u origin kd/step-09-integrations
gh pr create --base integration --head kd/step-09-integrations \
  --title "STEP_09: Integrations and Public API" --body-file STEP_09_COMPLETED.md
```

Leave the PR as a draft. The integrator merges in numeric order.
