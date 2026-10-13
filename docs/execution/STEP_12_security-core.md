<!-- path: docs/execution/STEP_12_security-core.md -->
# STEP_12 — Security Foundation

| | |
| --- | --- |
| Step | `STEP_12` |
| Wave | Wave 2 (parallel) |
| Branch | `kd/step-12-security-core` (from `foundation-v1`, or `foundation-v2` for Wave 2) |
| Features owned | **273** |
| FEATURE_LIST.md lines | 3773-3787, 3789-3798, 3802-3809, 3811-3818, 3820-3824, 3826-3832, 3834-3848, 3852-3858, 3860-3867, 3869-3877, 3879-3890, 3894-3905, 3908-3917, 3921-3929, 3931-3934, 3936-3943, 3945-3952, 3955-3969, 39 ... (full list in STEP_FEATURES.md) |
| Feature IDs | 3178-3450 |
| Migration range | `migrations/1200-1299` |
| Depends on | foundation-v2. |

Read before writing any code: `MASTER_PROMPT.md`, `IMPLEMENTATION_PLAN.md`,
`SPEC_CONFLICTS.md`, `docs/execution/README.md`, `docs/execution/CONTRACTS.md`,
`docs/execution/FILE_OWNERSHIP.md`, `docs/execution/STEP_FEATURES.md`.

---

## 1. Scope

Multi-tenant isolation with RLS verification, storage isolation, encryption and
secret management, application security against injection and XSS, bot and abuse
prevention, file upload validation, token and link security, GDPR, CCPA and PDPA data
privacy, supply chain and CI security, webhook security, database performance rules, and
concurrency and race-condition controls.

Every one of the 273 features in the line range above is in scope. None may be skipped,
stubbed, or marked "Coming Soon". `docs/execution/STEP_FEATURES.md` is the authority on
which features are yours; if a feature is not in your line range, do not build it.

## 2. Batches

Work through these in order. Each batch ends with the exit gate green before the next
begins. Do not start a later batch while an earlier one is red.

1. `lib/security/rls.ts` plus `scripts/verify-rls.mjs`: prove default-deny on every
   table and prove cross-tenant reads return zero rows.
2. `lib/security/secrets.ts`: envelope encryption, AES-256-GCM, key derivation per tenant,
   rotation, no plaintext at rest or in logs.
3. `lib/security/sanitizer.ts` hardening: SQL injection prevention through parameterized
   queries only, XSS prevention, ReDoS checking, CSP nonce enforcement.
4. `lib/security/bot-defence.ts`: Cloudflare Turnstile, behavioural signals, honeypot
   fields, proof-of-work for anonymous mutations.
5. `lib/security/upload-guard.ts`: magic-byte sniffing, extension allowlist, size caps,
   ClamAV hook, EXIF strip.
6. `lib/security/link-guard.ts`: token entropy, expiry, single-use, revocation, leak
   detection.
7. Privacy: data subject access requests, consent ledger, erasure, portability export,
   data residency pinning.
8. Supply chain and CI: lockfile audit, SCA, secret scanning, SAST and DAST wiring.
9. Webhook security: signature verification, timestamp windows, replay protection.
10. Concurrency: advisory locks, row locks, serializable wallet updates, idempotency,
    double-submit tokens, cron leader locks.

## 3. Database

`encryption_keys`, `key_rotations`, `consent_records`, `data_subject_requests`,
`erasure_requests`, `data_residency_policies`, `bot_challenges`, `upload_scans`,
`token_revocations`.

Every table follows the base shape in `CONTRACTS.md` section 1: `id` (UUID v7),
`company_id`, `created_at`, `updated_at`, `deleted_at`, `version`, RLS enabled and forced,
a default-deny policy, explicit permissive policies, the audit trigger, the `updated_at`
trigger, `company_id` and `created_at` indexes, and partial unique constraints scoped to
`deleted_at is null`. Money columns are `numeric(18,4) not null`.

Every migration in `migrations/1200-1299` has a matching `_down.sql`. Migrations are
idempotent. Foreign keys are `on delete restrict`.

## 4. Contracts

Consumes logger, errors, HTTP layer. Provides `NetworkGuard`, `Sanitizer`, `BotDefence`
and `UploadGuard` used by every other step. Nothing here may be reimplemented locally.

## 5. Step notes

This step is the security floor. If another step needs a security control, it consumes
it from here. Zero Trust: never trust a request because it came from inside.

## 6. Files you own

See `docs/execution/FILE_OWNERSHIP.md`, section `STEP_12`. You may create and edit
only those paths. Everything else is read-only for you, including shared config, other
steps' directories and `FEATURE_LIST.md`.

Changes you need in a shared file go into `integrator/requests/step-12.json` in the
shape defined in `CONTRACTS.md` section 12. Never edit the shared file itself.

## 7. Exit gate

All of these must pass, and the output must be pasted into `STEP_12_COMPLETED.md`:

```
npm run typecheck
npm run lint
npm run build
npm run verify
npm run verify-db
npm run check-boundaries -- --step 12
```

Plus:

- `docs/feature-coverage.md` lists your 273 features as implemented, none skipped.
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

Create `STEP_12_COMPLETED.md` at the repository root containing:

1. Features implemented, listed by ID against your line range.
2. Files created and modified.
3. Migrations added, with their down migrations.
4. Dependencies and environment variables requested via `integrator/requests/step-12.json`.
5. Known issues and anything the integrator must wire by hand.
6. The exact command output of the exit gate.

Then:

```
git push -u origin kd/step-12-security-core
gh pr create --base integration --head kd/step-12-security-core \
  --title "STEP_12: Security Foundation" --body-file STEP_12_COMPLETED.md
```

Leave the PR as a draft. The integrator merges in numeric order.
