<!-- path: SPEC_CONFLICTS.md -->
# KD SOLUTION IT — Specification Conflicts (RESOLVED)

All five conflicts are now closed. Decisions were recorded on 2026-10-13 and are binding
for every work package. The findings below are retained as the audit trail for why each
decision was needed. No code has been written yet.

---

## C1 — Role model contradicts itself  (blocks WP-03)

`MASTER_PROMPT.md` lines 159–214 define **6 roles**:
`super_admin`, `ceo`, `admin_staff` (+7 sub-roles), `owner`, `staff`, no client role.
Line 68 explicitly removes `accountant`, line 69 removes `affiliate`, line 70 removes
`reseller/white-label partner`.

`FEATURE_LIST.md` line 12 states the role model is **3 roles** (the Bengali heading in the
source reads "3 roles"), and then the
table at lines 13–22 lists **7** entries:

| FEATURE_LIST row | Present in MASTER_PROMPT? | Nearest match |
| --- | --- | --- |
| `super_admin` | yes | `super_admin` |
| `CEO` | yes | `ceo` |
| `Account` | **no** | `admin_staff` sub-role `finance_analyst` |
| `Bloger` | **no** | `admin_staff` sub-role `content_manager` |
| `KYC Manager` | **no** | `admin_staff` sub-role `kyc_reviewer` |
| `owner` | yes | `owner` |
| `staff` | yes | `staff` |

Options:
1. **Adopt MASTER_PROMPT (recommended).** 6 top-level roles, 7 `admin_staff` sub-roles.
   `Account`, `Bloger`, `KYC Manager` become display labels for `finance_analyst`,
   `content_manager`, `kyc_reviewer`. One enum, clean permission matrix.
2. Adopt FEATURE_LIST. Add `account` and `blogger` as top-level roles, contradicting the
   explicit removals at MASTER_PROMPT lines 68–70.
3. Hybrid. 6 top-level roles, but `Account` / `Bloger` / `KYC Manager` are first-class
   sub-roles with their own permission sets rather than aliases.

---

## C2 — Feature IDs 3451–3608 are each assigned to two different features  (blocks the coverage audit)

158 IDs are duplicated. Measured: `grep -o '^[0-9]\+\.' FEATURE_LIST.md | sort -n | uniq -d`
returns 3451 through 3608 inclusive. The two blocks carry unrelated content.

Verified examples:

| ID | Line 4095 (storage / media section) | Line 4277 (deploy / cron section) |
| --- | --- | --- |
| 3451 | File preview (PDF/image in-app) | Netlify deploy config (netlify.toml) |
| 3452 | File metadata in Supabase (name, size, type, hash, drive_id) | `.env.example` template (all ENV documented) |
| 3475 | File search (name, type, date, tenant) | Cold-start reduction (pgBouncer) |
| 3476 | Google Drive file deletion recovery (30-day trash) | cron: recurring invoices (daily) |

Options:
1. **Renumber the second block to 4030–4187 (recommended).** 4,187 unique IDs, no
   content lost, no downstream reference broken because no code exists yet.
2. Keep the collision and key the manifest on `id + line number`. Ugly, and any human
   citing "feature 3452" stays ambiguous forever.
3. Merge the colliding pairs where they genuinely overlap and drop true duplicates.
   Requires reading 158 pairs one by one.

---

## C3 — Declared feature count is 3,950; the file contains 4,187

`MASTER_PROMPT.md` line 650 says "3,950 FEATURES" and the 11 part counts sum to exactly
3,950. `FEATURE_LIST.md` contains **4,187** numbered feature lines and **4,029** distinct
IDs. The declaration is stale by 237 features.

Options:
1. **Treat `FEATURE_LIST.md` as authoritative (recommended)** and correct the part counts
   in `MASTER_PROMPT.md`.
2. Treat 3,950 as the cap and descope 237 features — which 237 would have to be named
   explicitly, otherwise this becomes an arbitrary cut.

---

## C4 — The specification source is written in Bengali

`LC_ALL=C grep -c '[^ -~\t]' FEATURE_LIST.md` returns **4,731** non-ASCII lines out of
4,911. Rule 1 forbids non-ASCII in code, UI, comments, seeds, templates and messages. The
spec document is not application code, so this is not a rule violation, but it blocks the
CI English-only guard from being used for traceability and it blocks English code comments
that cite feature names.

Resolution already chosen in `IMPLEMENTATION_PLAN.md`, listed here for the record: build
`docs/feature-manifest.json` in WP-00 — one English record per feature with a stable slug,
section, part and work package. That manifest is the traceability source.
`FEATURE_LIST.md` stays untouched as the original.

No decision needed unless you want `FEATURE_LIST.md` itself translated in place.

---

## C5 — Storage fallback stated twice with different wording

`MASTER_PROMPT.md` Rule 3 (lines 47–63): files go to Google Drive only; Supabase Storage
is a fallback **when the Google Drive API is unavailable**.

`FEATURE_LIST.md` line 9: when no cloud drive is linked, **Supabase holds all data**.

Options:
1. **Single precedence chain (recommended):** `google-drive -> supabase-storage`, chosen
   per tenant at runtime, recorded as `storage_provider` on every file row, with automatic
   fallback on Drive failure and a provider-migration tool (already required by features
   3459–3460).
2. Hard requirement that Drive is configured before any tenant can upload, with Supabase
   used only for transient failures.

---

## Decision sheet — FINAL

| ID | Decision recorded | Consequence in code |
| --- | --- | --- |
| C1 | **Option 1 — MASTER_PROMPT model.** 6 top-level roles: `super_admin`, `ceo`, `admin_staff`, `owner`, `staff`, plus tokenized client access with no login. 7 `admin_staff` sub-roles. `Account`, `Bloger`, `KYC Manager` are display labels for `finance_analyst`, `content_manager`, `kyc_reviewer`. | `user_role_enum` has 6 values. Permission matrix in `lib/auth/permissions.ts` keyed on role + sub-role. No `account` or `blogger` enum value exists. |
| C2 | **Option 1 — renumber.** The second block currently using IDs 3451–3608 is renumbered to 4030–4187 during WP-00, producing 4,187 unique IDs. | `docs/feature-manifest.json` is keyed on unique IDs 1–4187. `FEATURE_LIST.md` is left byte-identical; the manifest is authoritative. |
| C3 | **Option 1 — 4,187.** `FEATURE_LIST.md` is authoritative; the 3,950 figure and the 11 part counts in `MASTER_PROMPT.md` are stale. | The WP-14 coverage report must read 4,187 of 4,187 before sign-off. Nothing is descoped. |
| C4 | **No in-place translation.** `FEATURE_LIST.md` stays as the original Bengali source. English `docs/feature-manifest.json` is the traceability source. | The English-only CI guard scans `app/ components/ lib/ services/ config/ migrations/ scripts/` and does not scan the two spec documents. |
| C5 | **Option 1 — per-tenant precedence chain** `google-drive -> supabase-storage`, resolved at runtime, with automatic fallback and a provider-migration tool. | Every file row carries `storage_provider`. `lib/storage/adapters/base.ts` exposes one interface; `lib/storage/upload.ts` selects the adapter and records the outcome. |
