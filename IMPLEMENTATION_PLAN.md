<!-- path: IMPLEMENTATION_PLAN.md -->
# KD SOLUTION IT — Implementation Plan (Step Breakdown, No Code Yet)

Status: PLANNING. No application code has been written. This document is the execution
contract for all subsequent work.

---

## 0. Verified Ground Truth

Everything in this section was read from the repository, not assumed.

### 0.1 Repository inventory

Command: `git ls-files` on branch `arena/7d6c4cf9-kdp2` (HEAD `6ee7cbf`).

| Path | Lines | Bytes |
| --- | --- | --- |
| `README.md` | 24 | 833 |
| `MASTER_PROMPT.md` | 1,621 | 64,533 |
| `FEATURE_LIST.md` | 4,911 | 364,978 |
| **Total tracked files** | **3** | — |

There is **no code in this repository**. No `package.json`, no `app/`, no `lib/`, no
`migrations/`. The project starts from zero. The mandatory directory tree in
`MASTER_PROMPT.md` lines 256–650 does not exist yet and must be created in WP-00.

### 0.2 Feature inventory (measured)

| Metric | Command | Result |
| --- | --- | --- |
| Numbered feature lines | `grep -c '^[0-9]\+\.' FEATURE_LIST.md` | **4,187** |
| Distinct feature IDs | `grep -o '^[0-9]\+\.' ... \| sort -n -u \| wc -l` | **4,029** |
| Reused (colliding) IDs | `... \| uniq -d \| wc -l` | **158** (IDs 3451–3608) |
| ID range | max of `^[0-9]+\.` | 1 – 4029, no gaps |
| Sub-sections (`X1.` style) | `grep -c '^[A-Z][0-9]*\. '` | 542 |
| Top-level sections (`A.`–`T.`) | `grep -c '^[A-Z]\. '` | 143 |
| Lines containing non-ASCII | `LC_ALL=C grep -c '[^ -~\t]'` | 4,731 of 4,911 |

`MASTER_PROMPT.md` line 650 declares **"3,950 FEATURES"** and splits them into 11 parts
(375 + 391 + 476 + 423 + 275 + 413 + 445 + 356 + 296 + 150 + 425 = 3,950, which sums
correctly internally). The file actually contains **4,187** feature lines. The declared
part counts are stale by 237 features.

### 0.3 Toolchain available in this workspace

| Tool | Result |
| --- | --- |
| Node.js | v22.22.3 |
| npm | 10.9.8 |
| pnpm | not installed |
| docker | not installed |
| psql / postgres server | not installed |
| python3 | 3.11.2 |
| git | 2.39.5 |
| `registry.npmjs.org` | reachable, HTTP 200 |
| Free disk | 20 GB |

Network egress is allow-listed to: `github.com`, `codeload.github.com`,
`api.github.com`, `registry.npmjs.org`, `pypi.org`, `files.pythonhosted.org`.

**Consequence:** Supabase, Google Drive, Stripe, PayPal, Paddle, NMI, Rapyd, Adyen,
Resend, Meta WhatsApp, Cloudflare Turnstile, Sentry and every social/bank API are
**unreachable from this workspace**. They must be built behind adapters with a
record/replay fixture layer so the code is real and executable here, and switchable to
live credentials by environment variable only. This is stated in WP-00 as a hard
requirement, not an excuse to stub business logic.

**Consequence:** with no docker and no local Postgres, SQL migrations are verified
against **`@electric-sql/pglite`** (real PostgreSQL 16 compiled to WASM, installed from
npmjs). RLS policies, triggers, advisory locks, `SELECT ... FOR UPDATE`, window
functions and check constraints all execute for real there. Supabase-only extensions
(`pgsodium`, `supabase_vault`, `pg_net`) are not present in PGlite; any migration using
them is additionally verified by static lint plus a documented manual run against a
real Supabase project. This limitation is declared rather than hidden.

---

## 1. Spec Conflicts — RESOLVED 2026-10-13

These contradictions were found inside the supplied specification. Each one changes code
that is expensive to retrofit, so each was put to the project owner for an explicit
decision before any code was written. All five are now closed. The full audit trail, with
the line-by-line evidence, is in `SPEC_CONFLICTS.md`.

| ID | Conflict | Recorded decision |
| --- | --- | --- |
| C1 | `MASTER_PROMPT` defines 6 roles; `FEATURE_LIST` says "3 roles" but lists 7, adding `Account`, `Bloger`, `KYC Manager` which appear nowhere in the master prompt | **MASTER_PROMPT model wins.** 6 top-level roles + 7 `admin_staff` sub-roles. `Account` / `Bloger` / `KYC Manager` are display labels for `finance_analyst` / `content_manager` / `kyc_reviewer`. No `account` or `blogger` enum value is created. |
| C2 | Feature IDs 3451–3608 are each assigned to two different features (158 collisions) | **Renumber** the second block to 4030–4187 in WP-00, giving 4,187 unique IDs. `FEATURE_LIST.md` is not edited; `docs/feature-manifest.json` is authoritative. |
| C3 | `MASTER_PROMPT` line 650 declares 3,950 features; the file contains 4,187 | **4,187 is the target.** Nothing is descoped. The WP-14 coverage report must read 4,187 of 4,187. |
| C4 | The specification source is written in Bengali (4,731 of 4,911 lines) | **No in-place translation.** `docs/feature-manifest.json` in English is the traceability source. The English-only guard scans source directories only, not the two spec documents. |
| C5 | Storage fallback stated twice with different wording | **Per-tenant precedence chain** `google-drive -> supabase-storage`, resolved at runtime, automatic fallback, provider-migration tool, `storage_provider` recorded on every file row. |

The original findings are preserved below for the record.

### C1 — Role model contradicts itself

`MASTER_PROMPT.md` lines 159–214 define **6 roles**: `super_admin`, `ceo`,
`admin_staff` (with 7 sub-roles), `owner`, `staff`, and explicitly **no client role**.

`FEATURE_LIST.md` line 12 declares the role model as **3 roles** (the Bengali phrase in
the source reads "3 roles") - then the table on
lines 13–22 lists **7**: `super_admin`, `CEO`, **`Account`**, **`Bloger`**,
**`KYC Manager`**, `owner`, `staff`.

`Account` and `Bloger` appear nowhere in `MASTER_PROMPT.md`. Under the master prompt
they map to `admin_staff` sub-roles `finance_analyst` and `content_manager`, and
`KYC Manager` maps to `kyc_reviewer`.

**Resolution recorded:** adopt the `MASTER_PROMPT.md` model of 6 top-level roles with 7
`admin_staff` sub-roles, and treat `Account` / `Bloger` / `KYC Manager` as *display
labels* for the `finance_analyst` / `content_manager` / `kyc_reviewer` sub-roles.
Requires confirmation.

### C2 — Feature IDs 3451–3608 are assigned twice

158 IDs are reused with completely different features. Verified examples:

| ID | `FEATURE_LIST.md` line 4095 | `FEATURE_LIST.md` line 4277 |
| --- | --- | --- |
| 3451 | "File preview (PDF/image in-app)" | "Netlify deploy config (netlify.toml)" |
| 3452 | "File metadata in Supabase (name, size, type, hash, drive_id)" | ".env.example template (all ENV documented)" |
| 3475 | "File search (name, type, date, tenant)" | "Cold-start reduction (pgBouncer)" |
| 3476 | "Google Drive file deletion recovery (30-day trash)" | "cron: recurring invoices (daily)" |

**Resolution recorded:** renumber the second block (currently Part 10 / enhanced
security) to 4030–4187, producing 4,187 unique IDs. Requires confirmation because it
changes every downstream reference.

### C3 — Declared feature count is 3,950; actual is 4,187

**Resolution recorded:** the on-disk `FEATURE_LIST.md` is authoritative; the 11 part
counts in `MASTER_PROMPT.md` line 650 are corrected in a follow-up edit.

### C4 — The specification source is written in Bengali

`FEATURE_LIST.md` has non-ASCII content on 4,731 of 4,911 lines. Rule 1 forbids
non-ASCII in code, UI, comments, seeds, templates and error messages. The spec document
itself is not application code, so this is not a violation — **but** it blocks
traceability, because the CI guard, the feature manifest and every code comment must be
English.

**Resolution (no decision needed, executed in WP-00):** extract a machine-readable,
English `docs/feature-manifest.json` — one record per feature with a stable English
slug, section, part and assigned work package. That manifest, not the Bengali prose, is
the traceability source that the "zero skipped features" audit runs against.
`FEATURE_LIST.md` is left untouched as the original source.

### C5 — Storage fallback policy is stated twice, differently

`MASTER_PROMPT.md` Rule 3 says files go to Google Drive only, with Supabase Storage as
fallback when Drive is unavailable. `FEATURE_LIST.md` line 9 adds that when no cloud
drive is linked, Supabase holds everything. These are compatible but need one precedence
rule in code.

**Resolution recorded:** precedence chain `google-drive -> supabase-storage`, selected
per tenant at runtime, recorded on every file row as `storage_provider`, with automatic
fallback and a migration tool for provider switch (already required by features
3459–3460).

---

## 2. Cross-Cutting Contract (Built Once in WP-00, Enforced Forever)

These are the invariants every later work package consumes. They exist so that rules
1–20 are enforced mechanically instead of by memory.

| # | Contract | Mechanism |
| --- | --- | --- |
| X1 | English-only source | `scripts/check-english-only.sh` over `app/ components/ lib/ services/ config/ migrations/`, blocks non-ASCII; ESLint `no-restricted-syntax` |
| X2 | Money is never `Number` | `lib/money/` value type over `decimal.js`; guard script rejects `number` on any identifier matching `/(amount|total|subtotal|tax|fee|balance|price|rate_value|net|gross)/` in `lib/ services/ app/api/` |
| X3 | DB column for money | `numeric(18,4) NOT NULL`; migration linter rejects `float`/`double precision`/`real` and bare `numeric` |
| X4 | Path comment on line 1 | `scripts/check-path-comment.sh` — every `.ts`/`.tsx`/`.sql` starts with `// path: <real path>` and the path must match its location |
| X5 | No `any` | `tsconfig.json` strict + `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters`; ESLint `@typescript-eslint/no-explicit-any: error` |
| X6 | No `console.log` | ESLint `no-console: error`; only `lib/logger/` may use a transport |
| X7 | No TODO/FIXME/Coming Soon | guard script scans source and rejects the tokens, plus "coming soon", "lorem", "placeholder" |
| X8 | No test files | guard script rejects `*.test.ts(x)`, `*.spec.ts(x)`, any `tests/` or `__tests__/` directory |
| X9 | Base table shape | `migrations/0000_extensions.sql` installs a `uuid_generate_v7()` function; a documented DDL convention adds `id`, `company_id`, `created_at`, `updated_at`, `deleted_at`, `version` to every table |
| X10 | RLS default-deny | every table gets `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` plus `FORCE ROW LEVEL SECURITY`, a deny-all policy, then explicit grants; migration linter fails a migration that creates a table without a deny policy |
| X11 | Audit on every mutation | shared `audit_logs` table + generic trigger function installed once, attached per table |
| X12 | Soft-delete correctness | partial unique indexes scoped `WHERE deleted_at IS NULL` |
| X13 | Every mutation audited + idempotent | `services/` base mutation wrapper applies audit, idempotency key, optimistic-lock `version` check, correlation ID |
| X14 | Zod everywhere | `lib/validation/` schema registry shared by client forms and `app/api/` route handlers; no route handler may read `request.json()` raw |
| X15 | Sanitization | `lib/security/sanitizer.ts` (DOMPurify + attribute allowlist) applied on input and on render; CSP nonce middleware on every response |
| X16 | Payment idempotency | `idempotency_key` unique per tenant on all payment, payout and webhook tables |
| X17 | Approval chain | `lib/auth/approval-engine.ts` with L1 staff / L2 CEO / L3 super_admin, SLA escalation, delegation, dual approval |
| X18 | Partner naming | guard script rejects the forbidden brand list; registry only ever emits "Global Payout Partners" and "Local Payment Methods via Licensed Partners" |
| X19 | VPN/proxy/Tor gate | `lib/security/network-guard.ts` invoked on signup, payment, KYC and every admin route |
| X20 | Nav integrity | `config/nav-map.ts` single source; guard script walks the map and the `app/` tree and fails on any route not registered or any dead link |
| X21 | Adapter + fixture layer | every external service implements `lib/*/adapters/base.ts` and ships a fixture adapter, so all code paths execute offline in this workspace |

---

## 3. Work Packages

> **Superseded in part by the step breakdown.** The 15 packages below describe the
> technical dependency order. The executable unit of work is now the **16 steps** in
> `docs/execution/README.md`, each built in its own chat session with exclusive file
> ownership so that steps can run in parallel without conflict or duplication.
>
> | Steps | Corresponding packages |
> | --- | --- |
> | STEP_00 | WP-00 |
> | STEP_01 | WP-05 (design system and public site) |
> | STEP_02 | WP-03 (auth) |
> | STEP_03 | WP-04 (email) plus onboarding and settings |
> | STEP_04 | WP-01 remainder (team, KYC, notifications, plans) |
> | STEP_05 | WP-01 (schema) plus WP-06 (invoice core) |
> | STEP_06 | WP-06 remainder plus WP-07 |
> | STEP_07 | WP-08 |
> | STEP_08 | WP-09 |
> | STEP_09 | WP-10 |
> | STEP_10 | WP-11 |
> | STEP_11 | WP-12 |
> | STEP_12 | WP-13 (security foundation) |
> | STEP_13 | WP-04 (storage) plus media and edge cases |
> | STEP_14 | WP-14 |
> | STEP_15 | WP-13 (enhanced security, Zero Trust) |
>
> Every one of the 4,187 features is allocated to exactly one step in
> `docs/execution/STEP_FEATURES.md`. Nothing below is descoped by this change.

Twenty packages. The 10 chat boundaries from `MASTER_PROMPT.md` lines 1469–1571 are
preserved exactly and mapped in section 4. Each package lists scope, key paths and the
acceptance gate that must pass before the next package starts.

### WP-00 — Bootstrap, Governance, Verification Harness

Precedes Chat 1. Nothing else can be verified without it.

Scope:
- `package.json`, `tsconfig.json` (strict, path aliases), `tailwind.config.ts`,
  `postcss.config.ts`, `next.config.mjs`, `.eslintrc.json`, `.prettier.json`,
  `.editorconfig`, `.gitignore`, `.env.example`, `netlify.toml`, `Dockerfile`,
  `docker-compose.yml`.
- `components.json` + shadcn/ui primitives set.
- All 21 guard scripts of section 2 in `scripts/`, wired to `npm run verify` and to
  `.husky/pre-commit`.
- `.github/workflows/ci.yml`, `deploy.yml`, `security.yml`, `CODEOWNERS`,
  `pull_request_template.md`.
- `docs/feature-manifest.json` extracted from `FEATURE_LIST.md` (English slugs, C4),
  with the colliding IDs 3451-3608 in the second block renumbered to 4030-4187 so
  all 4,187 IDs are unique (C2). The extraction script prints the mapping it applied.
- `scripts/migrate.mjs` — ordered, idempotent migration runner with checksum ledger and
  `_down.sql` support.
- `scripts/verify-db.mjs` — runs every migration against PGlite, then asserts the
  invariants of X9–X12 on every table.
- `lib/logger/` (structured JSON, correlation ID, PII scrub) and
  `lib/errors/` (custom error classes, `{ error: { code, message, details, correlation_id } }`).

Acceptance gate: `npm run typecheck && npm run lint && npm run build && npm run verify`
all exit 0; `npm run verify` executes the guard scripts and reports which ones ran.

### WP-01 — Data Foundation (Chat 1)

Scope:
- `migrations/0000_extensions.sql` — `uuid_generate_v7()`, `updated_at` trigger
  function, audit trigger function, `soft_delete` helper, default-deny helper.
- `migrations/0001_platform_core.sql` + `_down.sql` — `companies`, `users`,
  `memberships`, `roles`, `admin_sub_roles`, `permissions`, `role_permissions`.
- `migrations/0002_audit.sql` + `_down.sql` — `audit_logs` (append-only, revoked
  UPDATE/DELETE), `audit_log_hash_chain`.
- `migrations/0003_security.sql` + `_down.sql` — `ip_reputation`, `device_fingerprints`,
  `sessions`, `login_attempts`, `rate_limit_buckets`, `idempotency_keys`,
  `webhook_processed_events`.
- `migrations/0004_plans_entitlements.sql` + `_down.sql` — `plans`, `plan_limits`,
  `subscriptions`, `entitlements`, `coupons`.
- `lib/supabase/{client,server,admin,middleware,rls-helpers}.ts`.
- `lib/db/types.ts` generated column types, `lib/db/query.ts` (parameterized only,
  column allowlists, cursor pagination, 30 s statement timeout).

Acceptance gate: `npm run verify-db` applies all migrations up and down, then asserts
per table that the 5 base columns, `version`, RLS enabled, a deny policy and the audit
trigger all exist; the assertion output is printed.

### WP-02 — Money, Errors, Validation Kernel (Chat 1)

Scope: `lib/money/{money,tax,rounding,currency,fx}.ts` on `decimal.js`;
`lib/validation/{registry,primitives,sanitize}.ts`; `lib/security/sanitizer.ts`;
`lib/http/{api-handler,rate-limit,idempotency,csrf,csp,correlation}.ts`;
`config/{permissions,plans,constants}.ts`.

Acceptance gate: a script in `scripts/` (not a test file — a maintenance CLI) exercises
`Money` add/subtract/mul/div, banker's rounding, 4-decimal persistence round-trip and
tax split, and prints the results; the money-type guard script passes over `lib/`.

### WP-03 — Auth, Roles, Approval Engine (Chat 1)

Scope: `lib/auth/{roles,permissions,approval-engine,approval-rules,two-factor,oauth,session,step-up}.ts`;
`migrations/0005_auth_2fa.sql`; `app/(auth)/{login,signup,forgot-password,reset-password,verify-email,2fa}`;
`app/api/auth/*`; `middleware.ts`; `app/api/approvals/*`; `app/(admin)/approvals/*`.

Acceptance gate: `npm run typecheck`; a script prints the resolved permission matrix for
all 6 roles and 7 sub-roles and the approval level for a sample action set, so the
hierarchy of Rule 16/17 is visibly correct.

### WP-04 — Storage + Email Adapters (Chat 1)

Scope: `lib/storage/adapters/{base,google-drive,supabase}.ts`, `lib/storage/{encryption,upload,file-validator,quota,trash}.ts`
(AES-256-GCM, per-tenant key derivation, EXIF strip, MIME sniff, content-hash dedup,
signed URLs, 30-day trash, fallback chain C5);
`lib/email/adapters/{base,resend,sendgrid,ses,mailgun,postmark,smtp}.ts`,
`lib/email/{queue,deliverability,template-engine}.ts`;
`migrations/0006_files_email.sql`.

Acceptance gate: the fixture adapters round-trip a real file through encrypt -> upload ->
download -> decrypt -> checksum compare and print the digest; the email queue
`FOR UPDATE SKIP LOCKED` claim path executes against PGlite.

### WP-05 — Design System + Shell + Public Site (Chat 1)

Scope: design tokens (`config/design-tokens.json`, CSS custom properties), motion tokens,
`app/globals.css`, favicon/manifest/OG pack, `components/ui/*`, `components/layout/*`,
`config/nav-map.ts`, command palette, breadcrumbs, all four page states as reusable
components, `app/(public)/*` (45 pages), `app/(dashboard)/layout.tsx`,
`app/(admin)/layout.tsx`, `app/(client-portal)/layout.tsx`, onboarding wizard,
`app/{not-found,error,loading,global-error}.tsx`.

Acceptance gate: `npm run build` succeeds; the nav-integrity guard reports 0 unregistered
routes and 0 dead links; the English-only guard reports 0 violations.

### WP-06 — Invoicing Core (Chat 2)

Scope: `migrations/0007_invoicing.sql`; `services/invoice-service.ts`;
`app/(dashboard)/invoices/*`; `app/api/invoices/*`; line-item editor; gapless numbering
under `pg_advisory_xact_lock`; status workflow; `components/pdf/*` with
`@react-pdf/renderer`; Amazon-vendor-compliant US layout; duplicate detection;
optimistic locking; audit on every mutation.

Acceptance gate: a script provisions a tenant in PGlite, creates two invoices
concurrently through the real service path and prints the two sequential gapless numbers
plus the audit rows produced.

### WP-07 — CRM, Catalog, Inventory, Suppliers, Reports (Chat 3)

Scope: clients (CRUD/search/merge/fuzzy dedup), products & services, inventory &
warehouses with `SELECT ... FOR UPDATE` stock movement, suppliers, purchase orders,
expenses, projects, dashboard and base reports, Shopify/WooCommerce webhook ingestion.

Acceptance gate: stock decrement concurrency path executes against PGlite and the
resulting balance is printed.

### WP-08 — Payments, Gateways, MoR, Wallet, Disputes (Chat 4)

Scope: `lib/payment/adapters/{base,stripe,paypal,paddle,nmi,rapyd,adyen,custom}.ts`;
`lib/payment/{mor-engine,routing,wallet,payout,fee-calculator}.ts`; payment links and
hosted checkout; KYC-gated routing; `app/api/webhooks/{stripe,paypal,paddle,nmi,rapyd,adyen}`;
chargeback/dispute management; evidence-pack generator;
`app/(admin)/{gateways,payouts,disputes}`; `app/(dashboard)/{payments,wallet}`.
"Global Payout Partners" / "Local Payment Methods via Licensed Partners" naming only (X18).

Acceptance gate: each adapter is driven through the fixture layer for authorize, capture,
refund and webhook verification, and the fee calculator output is printed for a sample
basket; the forbidden-brand guard reports 0 hits.

### WP-09 — Client Portal, Templates, Tenant Branding (Chat 5)

Scope: HMAC tokenized links with expiry and revocation; `app/(client-portal)/{i,e,r,hub,c}/[token]`;
full email template library; per-tenant branding and white-label tier; document
integrity, e-sign evidence, receipt rendering.

Acceptance gate: token sign/verify/expiry/revoke path executes and prints the verdict for
valid, tampered and expired tokens.

### WP-10 — Automation & Integrations (Chat 6)

Scope: `lib/whatsapp/*` (Meta Cloud API, templates, campaigns, webhook verification);
`lib/social/adapters/*` (Facebook, Instagram, LinkedIn, X, Threads, Telegram, Pinterest)
plus scheduler and analytics; `app/api/public/v1/*` with API keys, scopes and rate
limits; outbound webhooks with HMAC signing and retry; Zapier/Make/Chrome extension;
bank feed (Plaid, Salt Edge); receipt OCR (Google Cloud Vision); contracts & e-signature;
multi-channel messaging inbox.

Acceptance gate: the public API key auth path and the outbound webhook HMAC signature
verification both execute and print their results.

### WP-11 — Admin, CMS, SEO, Marketing (Chat 7)

Scope: super-admin dashboard; CEO/admin_staff surfaces; full approval engine UI;
`app/(admin)/*` (users, tenants, plans, coupons, kyc, revenue, audit, cms, blog, emails,
support, branding, settings, feature-flags, health, fraud, compliance); CMS editor with
DOMPurify-sanitized Tiptap; blog; email template manager; 8 JSON-LD schemas, OG,
sitemap, robots; GA4/GTM/Meta CAPI/TikTok/LinkedIn/X/Clarity/Pinterest; conversion tools;
marketing automation.

Acceptance gate: build succeeds; a script renders each JSON-LD schema and validates it as
parseable JSON with the expected `@type`.

### WP-12 — Payroll, HR, Accounting, Reports (Chat 8)

Scope: payroll (earnings, deductions, tax, pay runs, payslips to Drive, year-end forms);
HR light; expense management; double-entry ledger with chart of accounts; journal entries
manual and automated with balanced-entry check; P&L, Balance Sheet, Cash Flow; bank
reconciliation; fixed assets and depreciation; budgets; multi-book; period close; tax
filing and compliance; 15+ financial reports.

Acceptance gate: a script posts an unbalanced journal entry and a balanced one through the
real service and prints that the first is rejected and the second lands, then prints the
trial balance.

### WP-13 — Security & Compliance Hardening (Chat 9)

Scope: all 10 security layers of `MASTER_PROMPT.md` lines 672–908; VPN/proxy/Tor
detection with ASN and IP-reputation feed; device fingerprinting; fraud rules engine;
Zero Trust policy evaluation; Zero Tolerance enforcement; immutable audit log with hash
chain and SIEM export adapter; GDPR/CCPA/PDPA data subject requests, consent, erasure,
data residency; full conflict and duplicate prevention suite; monitoring, alerting,
incident response runbooks; Netlify runtime constraints (10 s sync / 26 s background,
6 MB payload, raw-body preservation for webhooks, edge vs node runtime map).

Acceptance gate: the audit hash-chain verifier runs over seeded rows and prints the chain
verdict; the network guard is driven with fixture IP classes (residential, datacenter,
Tor exit, VPN) and prints the block/allow decision for each.

### WP-14 — Deploy, Cron, Observability, Docs, Final Audit (Chat 10)

Scope: `netlify.toml` and scheduled functions; Docker/VPS; GitHub Actions CI/CD; the 20
cron jobs with leader-lock overlap prevention; Sentry with PII scrubbing; uptime checks;
`README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `docs/ERD.md`, `docs/adr/*`; PWA and
service worker; performance budget enforcement; final full-rule audit and
`docs/feature-coverage.md` generated from `docs/feature-manifest.json`.

Acceptance gate: `npm run build` succeeds; the coverage report prints
implemented/total against the manifest and must show 4,187 of 4,187.

---

## 4. Traceability Matrix — Spec Parts to Work Packages

`MASTER_PROMPT.md` lines 655–665 define 11 parts; lines 1469–1571 define 10 chats.

| Spec part | Declared count | Chat | Work packages |
| --- | --- | --- | --- |
| 1 — Core Foundation & Branding | 375 | 1 | WP-00, WP-05 |
| 2 — Auth, Onboarding & Settings | 391 | 1 | WP-01, WP-02, WP-03, WP-04, WP-05 |
| 3 — Invoicing & Business Core | 476 | 2, 3 | WP-06, WP-07 |
| 4 — Payment, Gateway & MoR | 423 | 4 | WP-08 |
| 5 — Client Experience & Branding | 275 | 5 | WP-09 |
| 6 — WhatsApp, Social, API & Integrations | 413 | 6 | WP-10 |
| 7 — Super Admin, SEO, Analytics & Marketing | 445 | 7 | WP-11 |
| 8 — Payroll, HR, Accounting & Reports | 356 | 8 | WP-12 |
| 9 — Security, Compliance & Performance | 296 | 9 | WP-13 |
| 10 — Deploy, CI/CD & Final Polish | 150 | 10 | WP-14 |
| 11 — Enhanced Security, Roles & Zero Trust | 425 | 10 | WP-03, WP-13, WP-14 |
| **Declared total** | **3,950** | | |
| **Actual feature lines on disk** | **4,187** | | see conflict C3 |

---

## 5. Execution Cadence and Batching

4,187 features cannot land in one response. The cadence below keeps every increment
compiled, guarded and reviewable.

- One work package per batch of responses; a package is split into sub-batches of roughly
  15–30 files.
- Every sub-batch ends with `npm run typecheck && npm run lint && npm run verify` and,
  when migrations changed, `npm run verify-db`. A red gate stops the batch; it is not
  carried forward.
- Every chat boundary produces `CHAT_[N]_COMPLETED.md` with features implemented, files
  created or modified, migrations added, dependencies installed, known issues and the
  next chat's starting point, exactly as `MASTER_PROMPT.md` lines 1573–1590 require.
- Commits are conventional and atomic (`feat`, `fix`, `docs`, `refactor`, `perf`, `chore`),
  never on `main`.
- Nothing is marked done without a named code path that a real command executed.

Ordering rationale: WP-00 to WP-05 are dependency roots — money, RLS, audit, adapters,
logger and the design system are imported by everything downstream, so building them
first prevents a rewrite when Chat 4 payments or Chat 8 accounting arrive.

---

## 6. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| External APIs unreachable here | Payments, Drive, WhatsApp cannot be smoke-tested live | Adapter + fixture layer (X21); live credentials via env only; explicit "not verified live" note in each handoff |
| No local Postgres server | Migrations unverified | PGlite WASM Postgres; Supabase-only extensions linted statically and flagged |
| 158 duplicate feature IDs | Features silently skipped | Renumber per C2, manifest keyed on unique ID, coverage report blocks completion |
| Bengali source spec | Traceability impossible | English `docs/feature-manifest.json` (C4) |
| Role model contradiction | Auth rewrite mid-build | Resolve C1 before WP-03 |
| Rule 4 forbids tests | No regression safety net | Guard scripts, migration verifier and maintenance CLIs act as the executable checks; they are tooling, not test files |

---

## 7. Definition of Done (per feature)

`MASTER_PROMPT.md` lines 1591–1618 list 17 mandatory steps. A feature is complete only
when all 17 are demonstrably present:

1. read from the manifest; 2. TypeScript strict; 3. Zod validation; 4. sanitization;
5. RLS policy; 6. audit entry; 7. try-catch with custom errors; 8. correlation ID;
9. rate limit; 10. idempotency; 11. optimistic locking; 12. duplicate detection;
13. all four UI states; 14. responsive at 320 px; 15. accessible (ARIA, keyboard, focus);
16. dark mode; 17. path comment and JSDoc on complex logic.
