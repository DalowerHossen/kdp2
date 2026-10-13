<!-- path: docs/execution/STEP_15_zero-trust.md -->
# STEP_15 — Enhanced Security and Zero Trust

| | |
| --- | --- |
| Step | `STEP_15` |
| Wave | Wave 2 (parallel) |
| Branch | `kd/step-15-zero-trust` (from `foundation-v1`, or `foundation-v2` for Wave 2) |
| Features owned | **421** |
| FEATURE_LIST.md lines | 4446-4457, 4459-4470, 4472-4481, 4484-4511, 4515-4526, 4528-4540, 4544-4553, 4555-4573, 4575-4580, 4583-4596, 4598-4615, 4617-4622, 4625-4649, 4653-4667, 4669-4679, 4681-4696, 4700-4716, 4718-4728, 47 ... (full list in STEP_FEATURES.md) |
| Feature IDs | 3609-4029 |
| Migration range | `migrations/1500-1599` |
| Depends on | foundation-v2. |

Read before writing any code: `MASTER_PROMPT.md`, `IMPLEMENTATION_PLAN.md`,
`SPEC_CONFLICTS.md`, `docs/execution/README.md`, `docs/execution/CONTRACTS.md`,
`docs/execution/FILE_OWNERSHIP.md`, `docs/execution/STEP_FEATURES.md`.

---

## 1. Scope

Deep file upload security, immutable audit log with hash chaining and SIEM
export, fraud security deepening with user behaviour analytics and payment and account
fraud engines, data residency and sovereignty, dependency and supply chain security,
monitoring and incident response, VPN and proxy IP detection and blocking, zero script
injection input security, chargeback and refund documentation, user tracking and
anti-fraud, Zero Trust and Zero Tolerance policies, and the full conflict and duplicate
prevention suite.

Every one of the 421 features in the line range above is in scope. None may be skipped,
stubbed, or marked "Coming Soon". `docs/execution/STEP_FEATURES.md` is the authority on
which features are yours; if a feature is not in your line range, do not build it.

## 2. Batches

Work through these in order. Each batch ends with the exit gate green before the next
begins. Do not start a later batch while an earlier one is red.

1. `lib/audit/**`: append-only audit log, hash chain, tamper detection, retention,
   export to a pluggable SIEM.
2. `lib/siem/**`: adapters for Splunk, Elastic, Datadog and Chronicle, with a fixture
   adapter.
3. `lib/antifraud/**`: user behaviour analytics, device and IP reputation, velocity rules,
   payment fraud scoring, account takeover detection, manual review queue.
4. `lib/zerotrust/**`: per-request policy evaluation, continuous verification, least
   privilege, micro-segmentation of admin surfaces, step-up authentication.
5. VPN, proxy and Tor detection: ASN lookup, IP reputation feeds, datacenter detection,
   blocking on signup, payment, KYC and every admin route, with a fixture feed so the
   decision path executes offline.
6. Input security: server-side sanitization depth, client-side hardening, zero script
   injection verification.
7. Chargeback and refund evidence: automated evidence pack assembly, deadline tracking,
   submission records.
8. User tracking and anti-fraud: session analytics, fingerprinting, consent-respecting
   tracking.
9. Conflict and duplicate prevention: optimistic locking UI, real-time edit presence,
   edit lock timeout, and duplicate detection for invoices, payments, clients, products,
   expenses, journals, payroll, webhooks, emails, API requests, form submissions, files,
   imports, batch operations and cron overlap.

## 3. Database

`audit_log_chain`, `siem_exports`, `fraud_cases`, `fraud_rules`,
`fraud_scores`, `device_reputation`, `ip_reputation`, `network_verdicts`,
`chargeback_deadlines`, `evidence_packs`, `behaviour_events`, `edit_locks`,
`edit_presence`, `duplicate_hashes`.

Every table follows the base shape in `CONTRACTS.md` section 1: `id` (UUID v7),
`company_id`, `created_at`, `updated_at`, `deleted_at`, `version`, RLS enabled and forced,
a default-deny policy, explicit permissive policies, the audit trigger, the `updated_at`
trigger, `company_id` and `created_at` indexes, and partial unique constraints scoped to
`deleted_at is null`. Money columns are `numeric(18,4) not null`.

Every migration in `migrations/1500-1599` has a matching `_down.sql`. Migrations are
idempotent. Foreign keys are `on delete restrict`.

## 4. Contracts

Consumes the network guard from `STEP_12` and extends it with reputation scoring. Provides
`AuditService` used by `defineMutation` in every step, so its schema must be stable before
Wave 2 merges.

## 5. Step notes

The audit log is append-only at the database level: UPDATE and DELETE are revoked. The
hash chain makes silent edits detectable. Zero Tolerance means a detected violation blocks
the action, it does not merely log it.

## 6. Files you own

See `docs/execution/FILE_OWNERSHIP.md`, section `STEP_15`. You may create and edit
only those paths. Everything else is read-only for you, including shared config, other
steps' directories and `FEATURE_LIST.md`.

Changes you need in a shared file go into `integrator/requests/step-15.json` in the
shape defined in `CONTRACTS.md` section 12. Never edit the shared file itself.

## 7. Exit gate

All of these must pass, and the output must be pasted into `STEP_15_COMPLETED.md`:

```
npm run typecheck
npm run lint
npm run build
npm run verify
npm run verify-db
npm run check-boundaries -- --step 15
```

Plus:

- `docs/feature-coverage.md` lists your 421 features as implemented, none skipped.
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

Create `STEP_15_COMPLETED.md` at the repository root containing:

1. Features implemented, listed by ID against your line range.
2. Files created and modified.
3. Migrations added, with their down migrations.
4. Dependencies and environment variables requested via `integrator/requests/step-15.json`.
5. Known issues and anything the integrator must wire by hand.
6. The exact command output of the exit gate.

Then:

```
git push -u origin kd/step-15-zero-trust
gh pr create --base integration --head kd/step-15-zero-trust \
  --title "STEP_15: Enhanced Security and Zero Trust" --body-file STEP_15_COMPLETED.md
```

Leave the PR as a draft. The integrator merges in numeric order.
