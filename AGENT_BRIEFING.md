# Agent Briefing — One Template For All 16 Chats

This file is the single instruction every chat must follow. It exists so that sixteen
separate chats, run at different times by different agents, produce one coherent
production-grade platform instead of sixteen incompatible fragments.

Two things live here:

1. **The template** — copy it into a new chat, fill the four blanks, send.
2. **The value table** — what to put in those blanks for each of the 16 steps.

Nothing else needs to be explained to a new chat. The template makes the agent read
everything it needs by itself.

---

## Part A — The Template

Copy everything between the lines. Replace the four `<...>` values using Part B.
Do not shorten it. Do not translate it. Send it as the very first message.

```
You are one agent in a 16-agent build of KD SOLUTION IT, an enterprise multi-tenant
SaaS platform. Other agents are building the other steps, some at the same time as
you. Your work must fit theirs without a single merge conflict and without a single
duplicated feature.

MY STEP: STEP_<NN> — <STEP_NAME>
FEATURES I OWN: <FEATURE_COUNT> features, FEATURE_LIST.md lines <LINE_RANGE>
MIGRATION RANGE: migrations/<MIG_RANGE>
MY OWNED PATHS: <OWNED_PATHS>

============================================================
PHASE 1 — READ BEFORE WRITING ANYTHING (no exceptions)
============================================================

Read these in this exact order, fully, before you write a single file:

 1. MASTER_PROMPT.md                       the 20 absolute rules
 2. IMPLEMENTATION_PLAN.md                 decisions already recorded
 3. SPEC_CONFLICTS.md                      C1-C5, all resolved, binding
 4. docs/execution/README.md               waves, anti-conflict rules, exit gate
 5. docs/execution/CONTRACTS.md            the 15 seams you must implement, not invent
 6. docs/execution/FILE_OWNERSHIP.md       the paths you may and may not touch
 7. docs/execution/STEP_FEATURES.md        which features are yours, by line number
 8. docs/execution/STEP_<NN>_<SLUG>.md     your scope, batches, tables, notes
 9. FEATURE_LIST.md, only your line range  the features themselves

Then reply with this confirmation and nothing else:

  - my step number and name
  - my feature count and line range
  - my migration range
  - my owned paths
  - the batch count for my step
  - three things I must NOT touch

Only start writing code after you have posted that confirmation.

============================================================
PHASE 2 — PLAN THE BREAKDOWN
============================================================

Your step is too large to write in one pass. Break it down before writing:

 1. Take the batch list from your step document.
 2. Split every batch into sub-batches of 5 to 15 files each.
 3. If your step owns more than 120 features, split further: no sub-batch may
    cover more than 15 features.
 4. Write the resulting plan into PLAN_STEP_<NN>.md as a checklist with one line
    per sub-batch, naming the files it will create and the feature IDs it covers.
 5. Post the checklist. Then start sub-batch 1.

Never hold the plan in your head. It must exist as a file so a later chat can
resume exactly where you stopped.

============================================================
PHASE 3 — WRITE, ONE SUB-BATCH AT A TIME
============================================================

For each sub-batch, in order:

 1. Write the files. Every file starts with `// path: <its real path>` on line 1.
 2. Run: npm run typecheck
 3. Run: npm run lint
 4. Run: npm run check-boundaries -- --step <NN>
 5. If you added or changed a migration, run: npm run verify-db
 6. Fix everything until all four are green.
 7. Tick the sub-batch in PLAN_STEP_<NN>.md.
 8. Commit: feat(step-<NN>): <what this sub-batch delivered>
 9. Move to the next sub-batch.

Never start the next sub-batch while the current one is red. Never batch up
three sub-batches and verify them together — that is how errors hide.

============================================================
PHASE 4 — ZERO TRUST AND ZERO TOLERANCE (applies to every step)
============================================================

Security is not a step. It is a property of every file you write.

ZERO TRUST — never trust a request because of where it came from:

 - Every route handler goes through defineRoute. No exceptions. Reading
   request.json() directly is a defect.
 - Every handler re-checks, on every call: identity, tenant membership,
   permission key, 2FA state, step-up state, rate limit, network verdict.
 - Tenant isolation is enforced in the database by RLS, not in application
   code. Application code may add checks; it may never be the only check.
 - Never trust client input, client-computed totals, client-supplied IDs, or a
   token because it looks well formed.
 - Every external call goes through its adapter, with timeouts, retries and a
   fixture implementation so the path runs offline.

ZERO TOLERANCE — a detected violation blocks the action, it never merely logs:

 - Cross-tenant read attempt -> deny, audit, flag the session.
 - Injection or XSS payload -> reject the request, do not sanitize and continue.
 - Missing idempotency key on a payment -> reject.
 - Money that does not reconcile to the cent -> reject, never round it away.
 - A table without RLS, without a default-deny policy, or without an audit
   trigger -> the build must fail, not warn.
 - A file written outside your owned paths -> the boundary check must fail.
 - A non-ASCII character in source -> the English-only guard must fail.
 - A TODO, FIXME, "Coming Soon", placeholder, `any`, console.log or test file
   -> the guards must fail.

If you cannot implement a control properly, do not ship a weakened version of it.
Stop and record it as blocked in your handoff document.

============================================================
PHASE 5 — PER-FILE AND PER-TABLE STANDARD
============================================================

Every file:
 - line 1 is `// path: <real path>`
 - TypeScript strict, no `any`, no `console.log`
 - explicit return types on functions, exported prop interfaces
 - errors handled with the custom error classes, never swallowed
 - max 500 lines; split it if longer
 - English only, in code, comments, strings and messages

Every table:
 - id (UUID v7), company_id, created_at, updated_at, deleted_at, version
 - money columns numeric(18,4) NOT NULL, never float
 - RLS enabled AND forced, a default-deny policy, then explicit grants
 - the audit trigger and the updated_at trigger
 - indexes on company_id and created_at
 - unique constraints scoped `WHERE deleted_at IS NULL`
 - a migration in your own range plus its matching _down.sql

Every mutation:
 - goes through defineMutation, so audit, idempotency and optimistic locking apply

Every page:
 - loading, error, empty and success states
 - usable at 320px, keyboard accessible, dark mode, real English copy

============================================================
PHASE 6 — EXIT GATE
============================================================

All of these must pass, and you must paste their real output into your handoff:

  npm run typecheck
  npm run lint
  npm run build
  npm run verify
  npm run verify-db
  npm run check-boundaries -- --step <NN>

A clean exit code is not a pass if the output is wrong. Read the numbers.

============================================================
PHASE 7 — HONESTY
============================================================

 - Every claim you make must come from a command you actually ran in this chat.
 - If you could not run a check, say so plainly and say why. Never present an
   unverified change as finished.
 - Never invent a feature as done. If a feature is blocked, list it as blocked
   with the reason.
 - Never write a placeholder and call it complete.

============================================================
PHASE 8 — HANDOFF
============================================================

Create STEP_<NN>_COMPLETED.md at the repository root containing:

 1. Every feature ID you own, marked implemented or blocked. None may be missing.
 2. Files created and modified.
 3. Migrations added, with their down migrations.
 4. Dependencies and environment variables requested in
    integrator/requests/step-<NN>.json
 5. Anything the integrator must wire by hand.
 6. The real output of every exit-gate command.

Then commit, push your assigned branch, and open a pull request whose base is
`integration`. Leave it as a draft. Do not merge it yourself.

============================================================
HARD BOUNDARIES
============================================================

 - Write only inside your owned paths.
 - Never edit: package.json, tsconfig.json, tailwind.config.ts, next.config.mjs,
   middleware.ts, app/globals.css, app/layout.tsx, config/nav-map.ts,
   lib/contracts/**, scripts/**, another step's folders, or FEATURE_LIST.md.
   Need a change there? Write it into integrator/requests/step-<NN>.json.
 - Never use a migration prefix outside your range.
 - Never import from another Wave 2 step. Import only from lib/contracts and the
   Wave 1 foundations.
 - Never create .test.ts, .spec.ts, tests/ or __tests__/.
 - Never merge your own pull request.
 - Work only on the branch you were assigned.
```

---

## Part B — Value Table

Fill the four blanks from this table. The owned-path lists are abbreviated here;
`docs/execution/FILE_OWNERSHIP.md` is the authority and the agent reads it anyway.

| Chat | NN | SLUG | STEP_NAME | FEATURES | LINE_RANGE | MIG_RANGE |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 00 | foundation | Foundation and Governance | 0 | none | 0000-0099 |
| 2 | 01 | design-system | Brand and Design System | 450 | 1-552 | 0100-0199 |
| 3 | 02 | auth | Authentication | 40 | 553-618 | 0200-0299 |
| 4 | 03 | smtp-onboarding | Universal SMTP, Onboarding and Settings | 133 | 619-781 | 0300-0399 |
| 5 | 04 | team-kyc-plans | Team, KYC, Notifications and Plans | 109 | 782-909 | 0400-0499 |
| 6 | 05 | invoice-core | Gateway Settings and Invoice Core | 145 | 910-1076 | 0500-0599 |
| 7 | 06 | crm-inventory | Invoicing Extensions, CRM and Inventory | 499 | 1077-1666 | 0600-0699 |
| 8 | 07 | payments | Payments, MoR, Wallet and Disputes | 390 | 1667-2124 | 0700-0799 |
| 9 | 08 | client-experience | Client Experience | 325 | 2125-2508 | 0800-0899 |
| 10 | 09 | integrations | Integrations and Public API | 323 | 2509-2879 | 0900-0999 |
| 11 | 10 | admin-marketing | Admin, CMS, SEO and Marketing | 499 | 2880-3452 | 1000-1099 |
| 12 | 11 | payroll-accounting | Payroll, HR and Accounting | 264 | 3453-3769 | 1100-1199 |
| 13 | 12 | security-core | Security Foundation | 273 | 3770-4094 | 1200-1299 |
| 14 | 13 | storage-media | Storage, Media and Edge Cases | 158 | 4095-4276 | 1300-1399 |
| 15 | 14 | deploy-cron | Deploy, Cron, CI and Documentation | 158 | 4277-4445 | 1400-1499 |
| 16 | 15 | zero-trust | Enhanced Security and Zero Trust | 421 | 4446-4912 | 1500-1599 |

Total: **4,187 features**, each owned by exactly one step.

### Owned paths per step (short form for the blank)

| NN | OWNED_PATHS to paste |
| --- | --- |
| 00 | everything, during this step only; after the foundation tag is cut, ownership passes to the integrator |
| 01 | `components/ui/**`, `components/layout/**`, `components/shared/**`, `components/marketing/**`, `components/charts/**`, `app/(public)/**`, `config/nav/01-design.nav.ts`, `config/permissions/01-design.ts`, `integrator/requests/step-01.json` |
| 02 | `lib/auth/**`, `app/(auth)/**`, `app/api/auth/**`, `components/auth/**`, `config/permissions/02-auth.ts`, `integrator/requests/step-02.json` |
| 03 | `lib/email/**`, `lib/onboarding/**`, `services/smtp-service.ts`, `services/onboarding-service.ts`, `services/settings-service.ts`, `app/(dashboard)/settings/**`, `app/(dashboard)/onboarding/**`, `app/api/email/**`, `app/api/settings/**`, `components/onboarding/**`, `components/settings/**`, `components/email/**`, `config/permissions/03-settings.ts`, `integrator/requests/step-03.json` |
| 04 | `services/team-service.ts`, `services/kyc-service.ts`, `services/notification-service.ts`, `services/plan-service.ts`, `app/(dashboard)/team/**`, `app/(dashboard)/notifications/**`, `app/(dashboard)/billing/**`, `app/api/team/**`, `app/api/kyc/**`, `app/api/notifications/**`, `app/api/subscriptions/**`, `components/team/**`, `components/kyc/**`, `components/notifications/**`, `config/permissions/04-team.ts`, `integrator/requests/step-04.json` |
| 05 | `services/invoice-service.ts`, `services/numbering-service.ts`, `services/gateway-settings-service.ts`, `app/(dashboard)/invoices/**`, `app/api/invoices/**`, `app/api/gateways/settings/**`, `components/invoice/**`, `components/forms/invoice/**`, `config/permissions/05-invoice.ts`, `integrator/requests/step-05.json` |
| 06 | `services/client-service.ts`, `services/product-service.ts`, `services/inventory-service.ts`, `services/supplier-service.ts`, `services/purchase-order-service.ts`, `services/estimate-service.ts`, `services/project-service.ts`, `services/report-service.ts`, `app/(dashboard)/clients|products|inventory|suppliers|estimates|projects|expenses|reports/**`, `app/api/clients|products|inventory|suppliers|estimates|projects|expenses|reports/**`, `components/tables/**`, `components/pdf/**`, `config/permissions/06-crm.ts`, `config/nav/06-crm.nav.ts`, `integrator/requests/step-06.json` |
| 07 | `lib/payment/**`, `services/payment-service.ts`, `services/payout-service.ts`, `services/wallet-service.ts`, `services/dispute-service.ts`, `services/mor-service.ts`, `app/(dashboard)/payments/**`, `app/(dashboard)/wallet/**`, `app/api/payments/**`, `app/api/wallet/**`, `app/api/webhooks/stripe|paypal|paddle|nmi|rapyd|adyen/**`, `app/(admin)/gateways/**`, `app/(admin)/payouts/**`, `app/(admin)/disputes/**`, `components/payment/**`, `config/permissions/07-payments.ts`, `config/nav/07-payments.nav.ts`, `integrator/requests/step-07.json` |
| 08 | `lib/portal/**`, `services/client-portal-service.ts`, `services/branding-service.ts`, `services/email-journey-service.ts`, `app/(client-portal)/**`, `app/api/portal/**`, `components/client/**`, `config/permissions/08-portal.ts`, `integrator/requests/step-08.json` |
| 09 | `lib/whatsapp/**`, `lib/social/**`, `lib/ocr/**`, `lib/bank-feed/**`, `lib/esignature/**`, `services/integration-service.ts`, `services/webhook-service.ts`, `services/messaging-service.ts`, `app/api/public/**`, `app/api/whatsapp/**`, `app/api/webhooks/shopify|woocommerce|whatsapp|outbound/**`, `app/(dashboard)/integrations|messages|contracts/**`, `components/integrations/**`, `config/permissions/09-integrations.ts`, `config/nav/09-integrations.nav.ts`, `integrator/requests/step-09.json` |
| 10 | `lib/cms/**`, `lib/seo/**`, `lib/analytics/**`, `lib/marketing/**`, `services/admin-service.ts`, `services/cms-service.ts`, `services/blog-service.ts`, `services/seo-service.ts`, `app/(admin)/**` except gateways, payouts and disputes, `app/api/admin/**`, `app/api/cms/**`, `app/api/blog/**`, `app/api/seo/**`, `components/admin/**`, `config/permissions/10-admin.ts`, `config/nav/10-admin.nav.ts`, `integrator/requests/step-10.json` |
| 11 | `lib/accounting/**`, `lib/payroll/**`, `services/payroll-service.ts`, `services/hr-service.ts`, `services/ledger-service.ts`, `services/journal-service.ts`, `services/statement-service.ts`, `services/reconciliation-service.ts`, `services/asset-service.ts`, `services/budget-service.ts`, `services/tax-service.ts`, `app/(dashboard)/payroll|hr|accounting/**`, `app/api/payroll/**`, `app/api/accounting/**`, `components/accounting/**`, `components/payroll/**`, `config/permissions/11-accounting.ts`, `config/nav/11-accounting.nav.ts`, `integrator/requests/step-11.json` |
| 12 | `lib/security/**`, `services/security-service.ts`, `services/fraud-service.ts`, `app/api/security/**`, `app/(admin)/compliance/**`, `config/permissions/12-security.ts`, `integrator/requests/step-12.json` |
| 13 | `lib/storage/**`, `lib/media/**`, `services/storage-service.ts`, `services/quota-service.ts`, `app/api/storage/**`, `app/api/pdf/**`, `app/(dashboard)/files/**`, `components/storage/**`, `config/permissions/13-storage.ts`, `integrator/requests/step-13.json` |
| 14 | `lib/cron/**`, `services/cron-service.ts`, `app/api/cron/**`, `app/api/health/**`, `netlify/functions/**`, `scripts/cron/**`, `docs/adr/**`, `docs/ERD.md`, `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `config/cron/**`, `config/permissions/14-ops.ts`, `integrator/requests/step-14.json` |
| 15 | `lib/zerotrust/**`, `lib/audit/**`, `lib/siem/**`, `lib/antifraud/**`, `services/audit-service.ts`, `services/siem-service.ts`, `services/chargeback-evidence-service.ts`, `services/tracking-service.ts`, `app/(admin)/audit/**`, `app/(admin)/fraud/**`, `app/api/audit/**`, `config/permissions/15-zerotrust.ts`, `integrator/requests/step-15.json` |

---

## Part C — Filled Examples

### Chat 1 header

```
MY STEP: STEP_00 — Foundation and Governance
FEATURES I OWN: 0 features, no FEATURE_LIST.md range; this step builds the ground
MIGRATION RANGE: migrations/0000-0099
MY OWNED PATHS: everything, during this step only; after the foundation tag is
cut, ownership passes to the integrator
```

### Chat 8 header

```
MY STEP: STEP_07 — Payments, MoR, Wallet and Disputes
FEATURES I OWN: 390 features, FEATURE_LIST.md lines 1667-2124
MIGRATION RANGE: migrations/0700-0799
MY OWNED PATHS: lib/payment/**, services/payment-service.ts,
services/payout-service.ts, services/wallet-service.ts,
services/dispute-service.ts, services/mor-service.ts,
app/(dashboard)/payments/**, app/(dashboard)/wallet/**, app/api/payments/**,
app/api/wallet/**, app/api/webhooks/stripe|paypal|paddle|nmi|rapyd|adyen/**,
app/(admin)/gateways/**, app/(admin)/payouts/**, app/(admin)/disputes/**,
components/payment/**, config/permissions/07-payments.ts,
config/nav/07-payments.nav.ts, integrator/requests/step-07.json
```

---

## Part D — Run Order

```
Chat 1   STEP_00        alone. Nothing else may start until its PR is merged.
Chat 2   STEP_01        after chat 1 merges
Chat 3   STEP_02        after chat 2 merges
Chat 4   STEP_03        after chat 3 merges
Chat 5   STEP_04        after chat 4 merges
Chat 6   STEP_05        after chat 5 merges
Chats 7-16  STEP_06 .. STEP_15   all ten at the same time, after chat 6 merges
Final    integrator chat           merges 06..15 in numeric order
```

Wave 1 is sequential because those five steps create the primitives every later step
imports: the money type, the auth layer, the email queue, the entitlement check, the
invoice schema. Building them in parallel would mean five copies of the same primitive.
From STEP_06 onward the domains are disjoint and the ownership map keeps them apart.

---

## Part E — If a Step Does Not Finish in One Chat

That is expected for the large steps. Do this:

1. Stop at a green gate. Never stop mid-sub-batch with a red typecheck.
2. Make sure `PLAN_STEP_<NN>.md` has every finished sub-batch ticked.
3. Write what remains into `STEP_<NN>_COMPLETED.md` under a heading
   `Remaining work`.
4. Commit and push.

Then open a new chat and send the same template with this line added at the top:

```
RESUME MODE: STEP_<NN> is partly done. Read PLAN_STEP_<NN>.md and
STEP_<NN>_COMPLETED.md first. Continue from the first unticked sub-batch.
Do not rewrite finished work. Verify it, then continue.
```

---

## Part F — Integrator Chat

After all sixteen steps have an open pull request, open one final chat and send:

```
You are the integrator for KD SOLUTION IT.

Read docs/execution/README.md section 5 and follow it exactly.

 1. Merge the open pull requests in numeric step order: 00, 01, 02 ... 15.
    One at a time.
 2. After each merge run npm run verify, npm run verify-db and npm run build.
    If any is red, stop. Do not merge the next one.
 3. Apply integrator/requests/step-*.json in step order: dependencies,
    environment variables, enum values, nav modules, permissions, cron jobs,
    CSP entries.
 4. If a merge conflicts, do not hand-edit another step's file. Send the branch
    back for a fix.
 5. Generate docs/feature-coverage.md from docs/feature-manifest.json and show
    that it reads 4187 of 4187.
 6. Only when everything is green, open a pull request from integration to main.

Report the real output of every command. Do not claim a green build you did
not run.
```
