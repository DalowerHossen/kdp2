<!-- path: docs/execution/FILE_OWNERSHIP.md -->
# KD SOLUTION IT — File Ownership Map

Every path in this repository has exactly one owner. A step may create and edit only the
paths it owns. `scripts/check-step-boundaries.sh` enforces this against
`docs/execution/ownership.json` and rejects any commit that crosses a boundary.

Notation: a trailing `**` means the whole subtree. `<slug>` is the step's own name, for
example `invoice` for `STEP_05`.

---

## Integrator-owned (no step may edit these)

These files are the merge-collision hotspots. `STEP_00` creates them. Later steps request
changes through `integrator/requests/step-NN.json` and never open them.

```
package.json
package-lock.json
tsconfig.json
tailwind.config.ts
postcss.config.ts
next.config.mjs
.eslintrc.json
.prettierrc.json
.editorconfig
.gitignore
.env.example
components.json
netlify.toml
Dockerfile
docker-compose.yml
middleware.ts
app/layout.tsx
app/globals.css
app/not-found.tsx
app/error.tsx
app/global-error.tsx
app/loading.tsx
.github/**
.husky/**
config/nav-map.ts
config/constants.ts
config/design-tokens.json
lib/contracts/**
lib/logger/**
lib/errors/**
lib/money/**
lib/http/**
lib/validation/**
lib/db/**
lib/supabase/**
scripts/**
migrations/0000_*.sql .. migrations/0099_*.sql
docs/execution/**
SPEC_CONFLICTS.md
IMPLEMENTATION_PLAN.md
```

`STEP_00` owns all of the above during Wave 0. After `foundation-v1` is tagged, ownership
passes to the integrator and becomes read-only for every step.

---

## Per-step exclusive paths

### STEP_01 — Brand and design system

```
components/ui/**
components/layout/**
components/shared/**
components/marketing/**
components/charts/**
app/(public)/**
config/nav/01-design.nav.ts
config/permissions/01-design.ts
migrations/0100_*.sql .. migrations/0199_*.sql
integrator/requests/step-01.json
STEP_01_COMPLETED.md
```

### STEP_02 — Authentication

```
lib/auth/**
app/(auth)/**
app/api/auth/**
components/auth/**
config/permissions/02-auth.ts
migrations/0200_*.sql .. migrations/0299_*.sql
integrator/requests/step-02.json
STEP_02_COMPLETED.md
```

### STEP_03 — SMTP, onboarding, settings

```
lib/email/**
lib/onboarding/**
services/smtp-service.ts
services/onboarding-service.ts
services/settings-service.ts
app/(dashboard)/settings/**
app/(dashboard)/onboarding/**
app/api/email/**
app/api/settings/**
components/onboarding/**
components/settings/**
components/email/**
config/permissions/03-settings.ts
migrations/0300_*.sql .. migrations/0399_*.sql
integrator/requests/step-03.json
STEP_03_COMPLETED.md
```

### STEP_04 — Team, KYC, notifications, plans

```
services/team-service.ts
services/kyc-service.ts
services/notification-service.ts
services/plan-service.ts
app/(dashboard)/team/**
app/(dashboard)/notifications/**
app/(dashboard)/billing/**
app/api/team/**
app/api/kyc/**
app/api/notifications/**
app/api/subscriptions/**
components/team/**
components/kyc/**
components/notifications/**
config/permissions/04-team.ts
migrations/0400_*.sql .. migrations/0499_*.sql
integrator/requests/step-04.json
STEP_04_COMPLETED.md
```

### STEP_05 — Gateways and invoice core

```
services/invoice-service.ts
services/numbering-service.ts
services/gateway-settings-service.ts
app/(dashboard)/invoices/**
app/api/invoices/**
app/api/gateways/settings/**
components/invoice/**
components/forms/invoice/**
config/permissions/05-invoice.ts
migrations/0500_*.sql .. migrations/0599_*.sql
integrator/requests/step-05.json
STEP_05_COMPLETED.md
```

### STEP_06 — Invoicing, CRM, inventory

```
services/client-service.ts
services/product-service.ts
services/inventory-service.ts
services/supplier-service.ts
services/purchase-order-service.ts
services/estimate-service.ts
services/project-service.ts
services/report-service.ts
app/(dashboard)/clients/**
app/(dashboard)/products/**
app/(dashboard)/inventory/**
app/(dashboard)/suppliers/**
app/(dashboard)/estimates/**
app/(dashboard)/projects/**
app/(dashboard)/expenses/**
app/(dashboard)/reports/**
app/api/clients/**
app/api/products/**
app/api/inventory/**
app/api/suppliers/**
app/api/estimates/**
app/api/projects/**
app/api/expenses/**
app/api/reports/**
components/tables/**
components/pdf/**
config/permissions/06-crm.ts
config/nav/06-crm.nav.ts
migrations/0600_*.sql .. migrations/0699_*.sql
integrator/requests/step-06.json
STEP_06_COMPLETED.md
```

### STEP_07 — Payments, MoR, wallet, disputes

```
lib/payment/**
services/payment-service.ts
services/payout-service.ts
services/wallet-service.ts
services/dispute-service.ts
services/mor-service.ts
app/(dashboard)/payments/**
app/(dashboard)/wallet/**
app/api/payments/**
app/api/wallet/**
app/api/webhooks/stripe/**
app/api/webhooks/paypal/**
app/api/webhooks/paddle/**
app/api/webhooks/nmi/**
app/api/webhooks/rapyd/**
app/api/webhooks/adyen/**
app/(admin)/gateways/**
app/(admin)/payouts/**
app/(admin)/disputes/**
components/payment/**
config/permissions/07-payments.ts
config/nav/07-payments.nav.ts
migrations/0700_*.sql .. migrations/0799_*.sql
integrator/requests/step-07.json
STEP_07_COMPLETED.md
```

### STEP_08 — Client experience

```
lib/portal/**
services/client-portal-service.ts
services/branding-service.ts
services/email-journey-service.ts
app/(client-portal)/**
app/api/portal/**
components/client/**
config/permissions/08-portal.ts
migrations/0800_*.sql .. migrations/0899_*.sql
integrator/requests/step-08.json
STEP_08_COMPLETED.md
```

### STEP_09 — Integrations and API

```
lib/whatsapp/**
lib/social/**
lib/ocr/**
lib/bank-feed/**
lib/esignature/**
services/integration-service.ts
services/webhook-service.ts
services/messaging-service.ts
app/api/public/**
app/api/whatsapp/**
app/api/webhooks/shopify/**
app/api/webhooks/woocommerce/**
app/api/webhooks/whatsapp/**
app/api/webhooks/outbound/**
app/(dashboard)/integrations/**
app/(dashboard)/messages/**
app/(dashboard)/contracts/**
components/integrations/**
config/permissions/09-integrations.ts
config/nav/09-integrations.nav.ts
migrations/0900_*.sql .. migrations/0999_*.sql
integrator/requests/step-09.json
STEP_09_COMPLETED.md
```

### STEP_10 — Admin, CMS, SEO, marketing

```
lib/cms/**
lib/seo/**
lib/analytics/**
lib/marketing/**
services/admin-service.ts
services/cms-service.ts
services/blog-service.ts
services/seo-service.ts
app/(admin)/**
app/api/admin/**
app/api/cms/**
app/api/blog/**
app/api/seo/**
components/admin/**
config/permissions/10-admin.ts
config/nav/10-admin.nav.ts
migrations/1000_*.sql .. migrations/1099_*.sql
integrator/requests/step-10.json
STEP_10_COMPLETED.md
```

`app/(admin)/gateways/**`, `app/(admin)/payouts/**` and `app/(admin)/disputes/**` belong
to `STEP_07` and are excluded from this step even though they sit under `app/(admin)`.
The boundary guard applies the more specific rule.

### STEP_11 — Payroll and accounting

```
lib/accounting/**
lib/payroll/**
services/payroll-service.ts
services/hr-service.ts
services/ledger-service.ts
services/journal-service.ts
services/statement-service.ts
services/reconciliation-service.ts
services/asset-service.ts
services/budget-service.ts
services/tax-service.ts
app/(dashboard)/payroll/**
app/(dashboard)/hr/**
app/(dashboard)/accounting/**
app/api/payroll/**
app/api/accounting/**
components/accounting/**
components/payroll/**
config/permissions/11-accounting.ts
config/nav/11-accounting.nav.ts
migrations/1100_*.sql .. migrations/1199_*.sql
integrator/requests/step-11.json
STEP_11_COMPLETED.md
```

### STEP_12 — Security foundation

```
lib/security/**
services/security-service.ts
services/fraud-service.ts
app/api/security/**
app/(admin)/compliance/**
config/permissions/12-security.ts
migrations/1200_*.sql .. migrations/1299_*.sql
integrator/requests/step-12.json
STEP_12_COMPLETED.md
```

### STEP_13 — Storage, media, edge cases

```
lib/storage/**
lib/media/**
services/storage-service.ts
services/quota-service.ts
app/api/storage/**
app/api/pdf/**
app/(dashboard)/files/**
components/storage/**
config/permissions/13-storage.ts
migrations/1300_*.sql .. migrations/1399_*.sql
integrator/requests/step-13.json
STEP_13_COMPLETED.md
```

### STEP_14 — Deploy, cron, CI, docs

```
lib/cron/**
services/cron-service.ts
app/api/cron/**
app/api/health/**
netlify/functions/**
scripts/cron/**
docs/adr/**
docs/ERD.md
README.md
CONTRIBUTING.md
SECURITY.md
config/cron/**
config/permissions/14-ops.ts
migrations/1400_*.sql .. migrations/1499_*.sql
integrator/requests/step-14.json
STEP_14_COMPLETED.md
```

`README.md` moves to `STEP_14` for the final documentation pass. Until `STEP_14` merges, no
other step may edit it. `scripts/**` stays integrator-owned; `STEP_14` owns only the
`scripts/cron/` subtree.

### STEP_15 — Enhanced security, Zero Trust

```
lib/zerotrust/**
lib/audit/**
lib/siem/**
lib/antifraud/**
services/audit-service.ts
services/siem-service.ts
services/chargeback-evidence-service.ts
services/tracking-service.ts
app/(admin)/audit/**
app/(admin)/fraud/**
app/api/audit/**
config/permissions/15-zerotrust.ts
migrations/1500_*.sql .. migrations/1599_*.sql
integrator/requests/step-15.json
STEP_15_COMPLETED.md
```

---

## Boundary resolution rules

1. The most specific matching rule wins. `app/(admin)/gateways/**` (STEP_07) beats
   `app/(admin)/**` (STEP_10).
2. If two steps both need a helper, it belongs in `lib/contracts/` and only the integrator
   may create it there. Steps declare the need in their request file.
3. A step may **read** any file. Ownership restricts writes only.
4. A step may never create a file at a path owned by another step, even a new file.

---

## Enforcing it

```
npm run check-boundaries -- --step 07
```

The script diffs the working tree and the branch against `foundation-v1`, resolves every
changed path against `docs/execution/ownership.json`, and exits non-zero listing the paths
that are not owned by the step. Run it before every commit; the pre-commit hook runs it
automatically.
