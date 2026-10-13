<!-- path: docs/execution/STEP_10_admin-marketing.md -->
# STEP_10 — Admin, CMS, SEO and Marketing

| | |
| --- | --- |
| Step | `STEP_10` |
| Wave | Wave 2 (parallel) |
| Branch | `kd/step-10-admin-marketing` (from `foundation-v1`, or `foundation-v2` for Wave 2) |
| Features owned | **499** |
| FEATURE_LIST.md lines | 2883-2895, 2897-2909, 2911-2921, 2925-2938, 2940-2956, 2958-2965, 2967-2981, 2985-2995, 2997-3004, 3006-3012, 3014-3027, 3029-3034, 3038-3048, 3050-3053, 3055-3062, 3064-3070, 3072-3078, 3080-3087, 30 ... (full list in STEP_FEATURES.md) |
| Feature IDs | 2415-2913 |
| Migration range | `migrations/1000-1099` |
| Depends on | foundation-v2. |

Read before writing any code: `MASTER_PROMPT.md`, `IMPLEMENTATION_PLAN.md`,
`SPEC_CONFLICTS.md`, `docs/execution/README.md`, `docs/execution/CONTRACTS.md`,
`docs/execution/FILE_OWNERSHIP.md`, `docs/execution/STEP_FEATURES.md`.

---

## 1. Scope

Super admin dashboard, user and tenant management, impersonation, CEO and
admin_staff surfaces, the full approval engine UI, platform plans and coupons, status page,
CMS editor, blog management, email template manager, SEO with eight JSON-LD schemas,
sitemap, robots and search-engine verification, analytics and pixels, conversion tools,
lead generation, marketing automation and platform intelligence.

Every one of the 499 features in the line range above is in scope. None may be skipped,
stubbed, or marked "Coming Soon". `docs/execution/STEP_FEATURES.md` is the authority on
which features are yours; if a feature is not in your line range, do not build it.

## 2. Batches

Work through these in order. Each batch ends with the exit gate green before the next
begins. Do not start a later batch while an earlier one is red.

1. `app/(admin)/**` overview, users, tenants, impersonation with an audited session
   banner and time limit.
2. `app/(admin)/approvals/**`: the approval queue, bulk approve, delegation, SLA timers,
   dual approval, full history chain.
3. `lib/cms/**` and `services/cms-service.ts`: page and block editor with Tiptap,
   DOMPurify sanitization, versioning, draft and publish, scheduled publishing.
4. `services/blog-service.ts`: posts, categories, tags, authors, related posts, RSS.
5. Email template manager: visual editor, variable registry, preview, test send,
   versioning.
6. `lib/seo/**`: eight JSON-LD schemas, per-page metadata, Open Graph, sitemap, robots,
   canonical URLs, search-engine verification files.
7. `lib/analytics/**`: GA4, GTM, Meta Pixel with CAPI, TikTok, LinkedIn, X, Clarity,
   Pinterest; consent-mode gating.
8. Conversion tools, lead capture, A/B testing, marketing automation journeys, status
   page and incident communication, platform health and intelligence dashboards.

## 3. Database

`cms_pages`, `cms_blocks`, `cms_versions`, `blog_posts`, `blog_categories`,
`blog_tags`, `email_template_versions`, `seo_metadata`, `json_ld_records`,
`analytics_events`, `consent_records`, `leads`, `lead_sources`, `ab_tests`,
`marketing_journeys`, `status_incidents`.

Every table follows the base shape in `CONTRACTS.md` section 1: `id` (UUID v7),
`company_id`, `created_at`, `updated_at`, `deleted_at`, `version`, RLS enabled and forced,
a default-deny policy, explicit permissive policies, the audit trigger, the `updated_at`
trigger, `company_id` and `created_at` indexes, and partial unique constraints scoped to
`deleted_at is null`. Money columns are `numeric(18,4) not null`.

Every migration in `migrations/1000-1099` has a matching `_down.sql`. Migrations are
idempotent. Foreign keys are `on delete restrict`.

## 4. Contracts

Consumes the approval engine, email queue, storage. Provides CMS content consumed by the
public site rendered in `STEP_01`; the public pages read published content through the
contract, they do not import this step's services.

## 5. Step notes

`app/(admin)/gateways`, `app/(admin)/payouts` and `app/(admin)/disputes` belong to
STEP_07 and are out of bounds here. Rich text is sanitized on write and on render.
Impersonation is always audited and always time-boxed.

## 6. Files you own

See `docs/execution/FILE_OWNERSHIP.md`, section `STEP_10`. You may create and edit
only those paths. Everything else is read-only for you, including shared config, other
steps' directories and `FEATURE_LIST.md`.

Changes you need in a shared file go into `integrator/requests/step-10.json` in the
shape defined in `CONTRACTS.md` section 12. Never edit the shared file itself.

## 7. Exit gate

All of these must pass, and the output must be pasted into `STEP_10_COMPLETED.md`:

```
npm run typecheck
npm run lint
npm run build
npm run verify
npm run verify-db
npm run check-boundaries -- --step 10
```

Plus:

- `docs/feature-coverage.md` lists your 499 features as implemented, none skipped.
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

Create `STEP_10_COMPLETED.md` at the repository root containing:

1. Features implemented, listed by ID against your line range.
2. Files created and modified.
3. Migrations added, with their down migrations.
4. Dependencies and environment variables requested via `integrator/requests/step-10.json`.
5. Known issues and anything the integrator must wire by hand.
6. The exact command output of the exit gate.

Then:

```
git push -u origin kd/step-10-admin-marketing
gh pr create --base integration --head kd/step-10-admin-marketing \
  --title "STEP_10: Admin, CMS, SEO and Marketing" --body-file STEP_10_COMPLETED.md
```

Leave the PR as a draft. The integrator merges in numeric order.
