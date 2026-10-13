<!-- path: docs/execution/STEP_11_payroll-accounting.md -->
# STEP_11 — Payroll, HR and Accounting

| | |
| --- | --- |
| Step | `STEP_11` |
| Wave | Wave 2 (parallel) |
| Branch | `kd/step-11-payroll-accounting` (from `foundation-v1`, or `foundation-v2` for Wave 2) |
| Features owned | **264** |
| FEATURE_LIST.md lines | 3456-3461, 3463-3468, 3470-3474, 3478-3490, 3492-3495, 3497-3500, 3502-3509, 3513-3528, 3530-3546, 3548-3559, 3563-3571, 3573-3579, 3581-3588, 3590-3601, 3605-3617, 3621-3628, 3630-3638, 3642-3651, 36 ... (full list in STEP_FEATURES.md) |
| Feature IDs | 2914-3177 |
| Migration range | `migrations/1100-1199` |
| Depends on | foundation-v2. |

Read before writing any code: `MASTER_PROMPT.md`, `IMPLEMENTATION_PLAN.md`,
`SPEC_CONFLICTS.md`, `docs/execution/README.md`, `docs/execution/CONTRACTS.md`,
`docs/execution/FILE_OWNERSHIP.md`, `docs/execution/STEP_FEATURES.md`.

---

## 1. Scope

Complete payroll with earnings, deductions, tax, pay runs, payslips, year-end
forms and an employee self-service portal, HR light, expanded expense management,
double-entry accounting with chart of accounts, manual and automated journal entries,
financial statements, accounting-grade bank reconciliation, fixed assets and depreciation,
budgets, multi-book accounting, period management and close, tax filing and compliance,
accounting-grade audit and financial data intelligence.

Every one of the 264 features in the line range above is in scope. None may be skipped,
stubbed, or marked "Coming Soon". `docs/execution/STEP_FEATURES.md` is the authority on
which features are yours; if a feature is not in your line range, do not build it.

## 2. Batches

Work through these in order. Each batch ends with the exit gate green before the next
begins. Do not start a later batch while an earlier one is red.

1. `lib/payroll/**` and `services/payroll-service.ts`: employee profiles, salary
   structures, earnings and deduction types, tax calculation, pay-run processing,
   payslip generation to storage, payroll to accounting posting.
2. Employee self-service portal over tokenized links, reusing the portal token contract.
3. `services/hr-service.ts`: leave, attendance, documents, performance notes.
4. `services/ledger-service.ts`: chart of accounts, account types, periods, fiscal years,
   balanced-entry enforcement.
5. `services/journal-service.ts`: manual entries, system-generated entries from invoices,
   payments, payroll and depreciation, reversal, duplicate detection.
6. `services/statement-service.ts`: profit and loss, balance sheet, cash flow, trial
   balance, plus 15+ financial reports.
7. `services/reconciliation-service.ts`: bank feeds to ledger matching, suggested matches,
   discrepancy handling.
8. `services/asset-service.ts`: fixed asset register, depreciation schedules, disposal.
9. `services/budget-service.ts`: budgets, variance analysis, alerts.
10. Multi-book, consolidation, period close with lock, tax filing and compliance.

## 3. Database

`employees`, `employee_documents`, `salary_structures`, `earnings`,
`deductions`, `pay_runs`, `pay_slips`, `payroll_taxes`, `leave_requests`,
`attendance_records`, `accounts`, `accounting_periods`, `journal_entries`,
`journal_lines`, `bank_accounts`, `bank_statement_lines`, `reconciliation_matches`,
`fixed_assets`, `depreciation_schedules`, `budgets`, `budget_lines`, `tax_filings`.

Every table follows the base shape in `CONTRACTS.md` section 1: `id` (UUID v7),
`company_id`, `created_at`, `updated_at`, `deleted_at`, `version`, RLS enabled and forced,
a default-deny policy, explicit permissive policies, the audit trigger, the `updated_at`
trigger, `company_id` and `created_at` indexes, and partial unique constraints scoped to
`deleted_at is null`. Money columns are `numeric(18,4) not null`.

Every migration in `migrations/1100-1199` has a matching `_down.sql`. Migrations are
idempotent. Foreign keys are `on delete restrict`.

## 4. Contracts

Consumes money, storage, email, portal tokens. Provides `LedgerService` which
`STEP_07` posts payment journals into through the contract interface.

## 5. Step notes

A journal entry that does not balance is rejected, not rounded. Every posting is
immutable once the period closes. Payroll duplicate detection on employee plus period is
mandatory. All amounts use the money type.

## 6. Files you own

See `docs/execution/FILE_OWNERSHIP.md`, section `STEP_11`. You may create and edit
only those paths. Everything else is read-only for you, including shared config, other
steps' directories and `FEATURE_LIST.md`.

Changes you need in a shared file go into `integrator/requests/step-11.json` in the
shape defined in `CONTRACTS.md` section 12. Never edit the shared file itself.

## 7. Exit gate

All of these must pass, and the output must be pasted into `STEP_11_COMPLETED.md`:

```
npm run typecheck
npm run lint
npm run build
npm run verify
npm run verify-db
npm run check-boundaries -- --step 11
```

Plus:

- `docs/feature-coverage.md` lists your 264 features as implemented, none skipped.
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

Create `STEP_11_COMPLETED.md` at the repository root containing:

1. Features implemented, listed by ID against your line range.
2. Files created and modified.
3. Migrations added, with their down migrations.
4. Dependencies and environment variables requested via `integrator/requests/step-11.json`.
5. Known issues and anything the integrator must wire by hand.
6. The exact command output of the exit gate.

Then:

```
git push -u origin kd/step-11-payroll-accounting
gh pr create --base integration --head kd/step-11-payroll-accounting \
  --title "STEP_11: Payroll, HR and Accounting" --body-file STEP_11_COMPLETED.md
```

Leave the PR as a draft. The integrator merges in numeric order.
