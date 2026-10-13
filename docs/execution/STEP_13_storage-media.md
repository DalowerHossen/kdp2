<!-- path: docs/execution/STEP_13_storage-media.md -->
# STEP_13 — Storage, Media and Edge Cases

| | |
| --- | --- |
| Step | `STEP_13` |
| Wave | Wave 2 (parallel) |
| Branch | `kd/step-13-storage-media` (from `foundation-v1`, or `foundation-v2` for Wave 2) |
| Features owned | **158** |
| FEATURE_LIST.md lines | 4095-4098, 4100-4112, 4114-4122, 4125-4138, 4142-4147, 4149-4153, 4155-4159, 4161-4174, 4176-4179, 4182-4201, 4205-4214, 4216-4221, 4223-4230, 4232-4238, 4241-4261, 4264-4275 |
| Feature IDs | 3451-3608 |
| Migration range | `migrations/1300-1399` |
| Depends on | foundation-v2. |

Read before writing any code: `MASTER_PROMPT.md`, `IMPLEMENTATION_PLAN.md`,
`SPEC_CONFLICTS.md`, `docs/execution/README.md`, `docs/execution/CONTRACTS.md`,
`docs/execution/FILE_OWNERSHIP.md`, `docs/execution/STEP_FEATURES.md`.

---

## 1. Scope

Google Drive adapter as primary storage with per-tenant folder isolation,
service-account OAuth, quota and rate-limit management, resumable and direct browser
uploads, signed download URLs, integrity verification, deletion recovery, the Supabase
Storage fallback, the provider migration tool, file lifecycle including versioning, orphan
cleanup, archive tier, retention and 30-day trash, media optimisation, Asia-focused
features, enterprise and B2B features, and system edge cases.

Every one of the 158 features in the line range above is in scope. None may be skipped,
stubbed, or marked "Coming Soon". `docs/execution/STEP_FEATURES.md` is the authority on
which features are yours; if a feature is not in your line range, do not build it.

## 2. Batches

Work through these in order. Each batch ends with the exit gate green before the next
begins. Do not start a later batch while an earlier one is red.

1. `lib/storage/adapters/google-drive.ts` and `supabase.ts` implementing
   `StorageAdapter`, with fixture adapters for offline execution.
2. `lib/storage/encryption.ts`: AES-256-GCM, per-tenant key derivation from the master
   key, envelope wrapping, zero-knowledge guarantee.
3. `lib/storage/upload.ts`: presigned and resumable upload, direct browser to Drive,
   checksum verification, content-hash deduplication.
4. `services/quota-service.ts`: per-plan quotas, usage dashboard, alerts at 80, 95 and
   100 percent, overage policy.
5. File lifecycle: versioning, orphan cleanup cron, archive tier, retention policy,
   soft-delete restore, 30-day trash, file search.
6. `lib/media/**`: browser-side resize to AVIF and WebP, EXIF and GPS stripping, size
   variants, srcset delivery, PDF font subsetting and image downsampling, gzip and brotli
   exports, watermarking.
7. Asia-focused features, enterprise and B2B features, and the system edge cases listed in
   the step's feature range.
8. `migrations/13xx_storage.sql`: files, file versions, storage quotas, storage usage,
   provider migration jobs.

## 3. Database

`files`, `file_versions`, `file_categories`, `storage_quotas`,
`storage_usage`, `storage_migrations`, `trash_items`.

Every table follows the base shape in `CONTRACTS.md` section 1: `id` (UUID v7),
`company_id`, `created_at`, `updated_at`, `deleted_at`, `version`, RLS enabled and forced,
a default-deny policy, explicit permissive policies, the audit trigger, the `updated_at`
trigger, `company_id` and `created_at` indexes, and partial unique constraints scoped to
`deleted_at is null`. Money columns are `numeric(18,4) not null`.

Every migration in `migrations/1300-1399` has a matching `_down.sql`. Migrations are
idempotent. Foreign keys are `on delete restrict`.

## 4. Contracts

Implements `StorageAdapter` from CONTRACTS.md section 7 with the precedence chain fixed by
decision C5. Every other step uploads through this and never calls Drive directly.

## 5. Step notes

The 6 MB Netlify payload limit means large uploads go direct from the browser to Drive
with a server-signed session. Metadata always lives in Supabase; only bytes live in Drive.

## 6. Files you own

See `docs/execution/FILE_OWNERSHIP.md`, section `STEP_13`. You may create and edit
only those paths. Everything else is read-only for you, including shared config, other
steps' directories and `FEATURE_LIST.md`.

Changes you need in a shared file go into `integrator/requests/step-13.json` in the
shape defined in `CONTRACTS.md` section 12. Never edit the shared file itself.

## 7. Exit gate

All of these must pass, and the output must be pasted into `STEP_13_COMPLETED.md`:

```
npm run typecheck
npm run lint
npm run build
npm run verify
npm run verify-db
npm run check-boundaries -- --step 13
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

Create `STEP_13_COMPLETED.md` at the repository root containing:

1. Features implemented, listed by ID against your line range.
2. Files created and modified.
3. Migrations added, with their down migrations.
4. Dependencies and environment variables requested via `integrator/requests/step-13.json`.
5. Known issues and anything the integrator must wire by hand.
6. The exact command output of the exit gate.

Then:

```
git push -u origin kd/step-13-storage-media
gh pr create --base integration --head kd/step-13-storage-media \
  --title "STEP_13: Storage, Media and Edge Cases" --body-file STEP_13_COMPLETED.md
```

Leave the PR as a draft. The integrator merges in numeric order.
