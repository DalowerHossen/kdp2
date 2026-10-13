<!-- path: docs/execution/STEP_07_payments.md -->
# STEP_07 — Payments, MoR, Wallet and Disputes

| | |
| --- | --- |
| Step | `STEP_07` |
| Wave | Wave 2 (parallel) |
| Branch | `kd/step-07-payments` (from `foundation-v1`, or `foundation-v2` for Wave 2) |
| Features owned | **390** |
| FEATURE_LIST.md lines | 1670-1683, 1685-1694, 1696-1704, 1706-1716, 1718-1723, 1725-1729, 1733-1743, 1745-1755, 1757, 1759, 1761-1762, 1764-1772, 1776-1783, 1787-1794, 1796-1802, 1804-1810, 1812-1825, 1829-1835, 1837-1847, 1 ... (full list in STEP_FEATURES.md) |
| Feature IDs | 1377-1766 |
| Migration range | `migrations/0700-0799` |
| Depends on | foundation-v2. |

Read before writing any code: `MASTER_PROMPT.md`, `IMPLEMENTATION_PLAN.md`,
`SPEC_CONFLICTS.md`, `docs/execution/README.md`, `docs/execution/CONTRACTS.md`,
`docs/execution/FILE_OWNERSHIP.md`, `docs/execution/STEP_FEATURES.md`.

---

## 1. Scope

Pluggable gateway adapters for Stripe, PayPal, Paddle, NMI, Rapyd, Adyen and a
JSON-driven custom gateway, Global Payout Partners and Local Payment Methods via Licensed
Partners, payment initiation, hosted checkout, payment links, pluggable iFrame/SDK/API
integration, Apple Pay and Google Pay, surcharges and fees, virtual wallet, merchant of
record routing, KYC-gated routing, payout processing, disputes and chargebacks,
subscriptions, BNPL, payment audit and an immutable evidence chain.

Every one of the 390 features in the line range above is in scope. None may be skipped,
stubbed, or marked "Coming Soon". `docs/execution/STEP_FEATURES.md` is the authority on
which features are yours; if a feature is not in your line range, do not build it.

## 2. Batches

Work through these in order. Each batch ends with the exit gate green before the next
begins. Do not start a later batch while an earlier one is red.

1. `lib/payment/adapters/**`: base plus stripe, paypal, paddle, nmi, rapyd, adyen,
   custom, each implementing `GatewayAdapter` with a fixture adapter for offline runs.
2. `lib/payment/routing.ts` and `lib/payment/mor-engine.ts`: gateway selection, KYC
   gating, fallback, merchant-of-record decision.
3. `lib/payment/fee-calculator.ts`: per-method, per-partner fees, surcharge rules.
4. `services/payment-service.ts`: initiation, capture, partial and full refund, retries,
   reconciliation against gateway records.
5. `services/wallet-service.ts`: ledger-based virtual wallet updated at SERIALIZABLE
   isolation, holds, releases, withdrawals.
6. `services/payout-service.ts`: payout batches, approval chain, partner routing, retries.
7. `services/dispute-service.ts` and the evidence-pack generator.
8. Webhook routes for all seven gateways with signature verification and event dedup.
9. `app/(dashboard)/payments|wallet/**`, `app/(admin)/gateways|payouts|disputes/**`.

## 3. Database

`payments`, `payment_attempts`, `payment_links`, `payment_methods`,
`refunds`, `payouts`, `payout_batches`, `wallet_accounts`, `wallet_ledger`,
`gateway_routes`, `disputes`, `dispute_evidence`, `chargeback_packets`,
`subscription_plans`, `subscriptions`, `payment_audit_events`.

Every table follows the base shape in `CONTRACTS.md` section 1: `id` (UUID v7),
`company_id`, `created_at`, `updated_at`, `deleted_at`, `version`, RLS enabled and forced,
a default-deny policy, explicit permissive policies, the audit trigger, the `updated_at`
trigger, `company_id` and `created_at` indexes, and partial unique constraints scoped to
`deleted_at is null`. Money columns are `numeric(18,4) not null`.

Every migration in `migrations/0700-0799` has a matching `_down.sql`. Migrations are
idempotent. Foreign keys are `on delete restrict`.

## 4. Contracts

Implements `GatewayAdapter` from CONTRACTS.md section 9. Consumes `InvoiceService` and
KYC status. Provides `PaymentService` consumed by `STEP_08` (client payment page).

## 5. Step notes

Every payment carries an idempotency key unique per tenant; a replayed key returns the
original result and never charges twice. Webhook handlers verify signatures before any
database write. Naming rule 18 is absolute: no payment brand names anywhere. All amounts
use the money type; wallet balance changes are serializable.

## 6. Files you own

See `docs/execution/FILE_OWNERSHIP.md`, section `STEP_07`. You may create and edit
only those paths. Everything else is read-only for you, including shared config, other
steps' directories and `FEATURE_LIST.md`.

Changes you need in a shared file go into `integrator/requests/step-07.json` in the
shape defined in `CONTRACTS.md` section 12. Never edit the shared file itself.

## 7. Exit gate

All of these must pass, and the output must be pasted into `STEP_07_COMPLETED.md`:

```
npm run typecheck
npm run lint
npm run build
npm run verify
npm run verify-db
npm run check-boundaries -- --step 07
```

Plus:

- `docs/feature-coverage.md` lists your 390 features as implemented, none skipped.
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

Create `STEP_07_COMPLETED.md` at the repository root containing:

1. Features implemented, listed by ID against your line range.
2. Files created and modified.
3. Migrations added, with their down migrations.
4. Dependencies and environment variables requested via `integrator/requests/step-07.json`.
5. Known issues and anything the integrator must wire by hand.
6. The exact command output of the exit gate.

Then:

```
git push -u origin kd/step-07-payments
gh pr create --base integration --head kd/step-07-payments \
  --title "STEP_07: Payments, MoR, Wallet and Disputes" --body-file STEP_07_COMPLETED.md
```

Leave the PR as a draft. The integrator merges in numeric order.
