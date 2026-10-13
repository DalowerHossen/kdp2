<!-- path: docs/execution/STEP_01_design-system.md -->
# STEP_01 — Brand and Design System

| | |
| --- | --- |
| Step | `STEP_01` |
| Wave | Wave 1 (sequential) |
| Branch | `kd/step-01-design-system` (from `foundation-v1`, or `foundation-v2` for Wave 2) |
| Features owned | **450** |
| FEATURE_LIST.md lines | 26-40, 42-51, 53-64, 66-74, 78-87, 89-97, 99-105, 107-110, 114-119, 121-128, 130-137, 139-151, 153-161, 165-172, 174-183, 185-190, 192-196, 198-204, 208-216, 218-222, 224-231, 235-243, 245-249, 251-25 ... (full list in STEP_FEATURES.md) |
| Feature IDs | 1-450 |
| Migration range | `migrations/0100-0199` |
| Depends on | STEP_00 merged and tagged foundation-v1. |

Read before writing any code: `MASTER_PROMPT.md`, `IMPLEMENTATION_PLAN.md`,
`SPEC_CONFLICTS.md`, `docs/execution/README.md`, `docs/execution/CONTRACTS.md`,
`docs/execution/FILE_OWNERSHIP.md`, `docs/execution/STEP_FEATURES.md`.

---

## 1. Scope

Brand identity, design tokens, theme system, layout architecture, responsive and
mobile-first standards, page-state completeness, navigation integrity, WCAG 2.1 AA
accessibility, the public marketing site, content standards, visual excellence, design QA,
illustrations and media, footer and shared components, print and export styles.

Every one of the 450 features in the line range above is in scope. None may be skipped,
stubbed, or marked "Coming Soon". `docs/execution/STEP_FEATURES.md` is the authority on
which features are yours; if a feature is not in your line range, do not build it.

## 2. Batches

Work through these in order. Each batch ends with the exit gate green before the next
begins. Do not start a later batch while an earlier one is red.

1. Design tokens: `config/design-tokens.json`, CSS custom properties, spacing, radius,
   shadow, motion, typography and colour scales; `components/ui/**` primitives.
2. Layout architecture: sidebar, topbar, page templates, the four layout shells, z-index
   scale, safe-area handling.
3. Page states and navigation: loading, error, empty and success components;
   `config/nav/01-design.nav.ts`; breadcrumbs; command palette; keyboard shortcuts.
4. Accessibility pass: focus rings, skip links, ARIA, screen-reader labels, contrast,
   reduced motion, high contrast.
5. Public site: all public pages under `app/(public)/**` with real English copy.
6. Visual and media: charts, illustrations, image optimisation, favicon and manifest pack,
   Open Graph images.
7. Shared and print: footer, shared components, print stylesheet for invoices and reports.

## 3. Database

No domain tables. If a table becomes necessary it uses the `0100-0199` range and follows
the base shape in CONTRACTS.md section 1.

Every table follows the base shape in `CONTRACTS.md` section 1: `id` (UUID v7),
`company_id`, `created_at`, `updated_at`, `deleted_at`, `version`, RLS enabled and forced,
a default-deny policy, explicit permissive policies, the audit trigger, the `updated_at`
trigger, `company_id` and `created_at` indexes, and partial unique constraints scoped to
`deleted_at is null`. Money columns are `numeric(18,4) not null`.

Every migration in `migrations/0100-0199` has a matching `_down.sql`. Migrations are
idempotent. Foreign keys are `on delete restrict`.

## 4. Contracts

Consumes `lib/contracts/nav.ts`, `lib/logger`, `lib/errors`. Provides the visual primitives
that every later step renders with, so component props must be exported interfaces.

## 5. Step notes

This step defines the look of the entire product. Every component must have full dark-mode
parity and be usable at 320px. No page may ship without all four states. No lorem ipsum and
no "Coming Soon" anywhere - real English copy on every page.

## 6. Files you own

See `docs/execution/FILE_OWNERSHIP.md`, section `STEP_01`. You may create and edit
only those paths. Everything else is read-only for you, including shared config, other
steps' directories and `FEATURE_LIST.md`.

Changes you need in a shared file go into `integrator/requests/step-01.json` in the
shape defined in `CONTRACTS.md` section 12. Never edit the shared file itself.

## 7. Exit gate

All of these must pass, and the output must be pasted into `STEP_01_COMPLETED.md`:

```
npm run typecheck
npm run lint
npm run build
npm run verify
npm run verify-db
npm run check-boundaries -- --step 01
```

Plus:

- `docs/feature-coverage.md` lists your 450 features as implemented, none skipped.
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

Create `STEP_01_COMPLETED.md` at the repository root containing:

1. Features implemented, listed by ID against your line range.
2. Files created and modified.
3. Migrations added, with their down migrations.
4. Dependencies and environment variables requested via `integrator/requests/step-01.json`.
5. Known issues and anything the integrator must wire by hand.
6. The exact command output of the exit gate.

Then:

```
git push -u origin kd/step-01-design-system
gh pr create --base integration --head kd/step-01-design-system \
  --title "STEP_01: Brand and Design System" --body-file STEP_01_COMPLETED.md
```

Leave the PR as a draft. The integrator merges in numeric order.
