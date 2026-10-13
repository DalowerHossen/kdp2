<!-- path: docs/execution/STEP_06_crm-inventory.md -->
# STEP_06 — Invoicing Extensions, CRM and Inventory

| | |
| --- | --- |
| Step | `STEP_06` |
| Wave | Wave 2 (parallel) |
| Branch | `kd/step-06-crm-inventory` (from `foundation-v1`, or `foundation-v2` for Wave 2) |
| Features owned | **499** |
| FEATURE_LIST.md lines | 1080-1088, 1090-1094, 1096-1100, 1104-1116, 1118-1123, 1125-1128, 1130-1134, 1136-1139, 1141-1148, 1150-1154, 1158-1166, 1168-1178, 1180-1188, 1192-1199, 1201-1213, 1215-1219, 1221-1227, 1229-1232, 12 ... (full list in STEP_FEATURES.md) |
| Feature IDs | 878-1376 |
| Migration range | `migrations/0600-0699` |
| Depends on | foundation-v2 (STEP_01..STEP_05 merged and tagged). |

Read before writing any code: `MASTER_PROMPT.md`, `IMPLEMENTATION_PLAN.md`,
`SPEC_CONFLICTS.md`, `docs/execution/README.md`, `docs/execution/CONTRACTS.md`,
`docs/execution/FILE_OWNERSHIP.md`, `docs/execution/STEP_FEATURES.md`.

---

## 1. Scope

Server-side PDF engine and American-style Amazon-acceptable invoice layout, PDF
optimisation and archival, estimates, projects and billable hours, client CRM with search
and merge, product and service catalogue, inventory and warehouses, suppliers and purchase
orders, expenses, dashboard and base reports, billing extras and international tax.

Every one of the 499 features in the line range above is in scope. None may be skipped,
stubbed, or marked "Coming Soon". `docs/execution/STEP_FEATURES.md` is the authority on
which features are yours; if a feature is not in your line range, do not build it.

## 2. Batches

Work through these in order. Each batch ends with the exit gate green before the next
begins. Do not start a later batch while an earlier one is red.

1. `components/pdf/**` and the server-side PDF engine with `@react-pdf/renderer`:
   US layout, branding auto-fill, font subsetting, image downsampling, object-stream
   compression, snapshot to storage on send.
2. `services/estimate-service.ts` plus estimate list, editor and approval flow.
3. `services/client-service.ts`: CRUD, cursor search, fuzzy duplicate detection, merge
   with conflict resolution, custom fields, segments.
4. `services/product-service.ts` and `services/inventory-service.ts`: catalogue, SKUs,
   multi-warehouse stock, movements under `SELECT ... FOR UPDATE`, reorder points, stock
   takes, barcode support.
5. `services/supplier-service.ts` and `services/purchase-order-service.ts`: suppliers,
   purchase orders, receiving, supplier bills.
6. `services/project-service.ts`: projects, tasks, time entries, billable hours to invoice.
7. `services/report-service.ts` and `app/(dashboard)/reports/**`: revenue, sales summary,
   tax summary, AR ageing, plus dashboard widgets and CSV/JSON export.
8. Expenses, recurring documents, deposits, credit notes, international tax rules.

## 3. Database

`clients`, `client_contacts`, `client_custom_fields`, `products`,
`product_variants`, `warehouses`, `stock_levels`, `stock_movements`, `suppliers`,
`purchase_orders`, `purchase_order_items`, `expenses`, `projects`, `tasks`,
`time_entries`, `estimates`, `estimate_items`, `document_snapshots`.

Every table follows the base shape in `CONTRACTS.md` section 1: `id` (UUID v7),
`company_id`, `created_at`, `updated_at`, `deleted_at`, `version`, RLS enabled and forced,
a default-deny policy, explicit permissive policies, the audit trigger, the `updated_at`
trigger, `company_id` and `created_at` indexes, and partial unique constraints scoped to
`deleted_at is null`. Money columns are `numeric(18,4) not null`.

Every migration in `migrations/0600-0699` has a matching `_down.sql`. Migrations are
idempotent. Foreign keys are `on delete restrict`.

## 4. Contracts

Consumes `InvoiceService`, money, storage, email. Provides `ClientService` and
`ProductService` consumed by `STEP_07` and `STEP_11` through contracts only.

## 5. Step notes

Stock deduction must be race-safe: read-modify-write without a row lock is a defect.
Client and product duplicate detection is mandatory before insert.

## 6. Files you own

See `docs/execution/FILE_OWNERSHIP.md`, section `STEP_06`. You may create and edit
only those paths. Everything else is read-only for you, including shared config, other
steps' directories and `FEATURE_LIST.md`.

Changes you need in a shared file go into `integrator/requests/step-06.json` in the
shape defined in `CONTRACTS.md` section 12. Never edit the shared file itself.

## 7. Exit gate

All of these must pass, and the output must be pasted into `STEP_06_COMPLETED.md`:

```
npm run typecheck
npm run lint
npm run build
npm run verify
npm run verify-db
npm run check-boundaries -- --step 06
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

Create `STEP_06_COMPLETED.md` at the repository root containing:

1. Features implemented, listed by ID against your line range.
2. Files created and modified.
3. Migrations added, with their down migrations.
4. Dependencies and environment variables requested via `integrator/requests/step-06.json`.
5. Known issues and anything the integrator must wire by hand.
6. The exact command output of the exit gate.

Then:

```
git push -u origin kd/step-06-crm-inventory
gh pr create --base integration --head kd/step-06-crm-inventory \
  --title "STEP_06: Invoicing Extensions, CRM and Inventory" --body-file STEP_06_COMPLETED.md
```

Leave the PR as a draft. The integrator merges in numeric order.
