<!-- path: docs/execution/README.md -->
# KD SOLUTION IT — Parallel Execution Playbook

This document governs how the platform is built when **each step is written in its own
separate chat session**, possibly at the same time, by different agents. Its single
purpose is to make that safe: no duplicate work, no file conflicts, no merge collisions.

Read this first. Then read `docs/execution/STEP_<NN>_<slug>.md` for the step you are
building. Read nothing else to decide scope — scope is fixed here, not negotiated.

---

## 1. The 16 steps

`STEP_00` is the foundation. It has no features from `FEATURE_LIST.md`; it builds the
scaffolding, the contracts and the guard scripts that every other step consumes.

`STEP_01` through `STEP_15` own all **4,187** features of `FEATURE_LIST.md`, each feature
assigned to exactly one step. The arithmetic is proven in section 3.

| Step | Name | Features | Feature IDs | FEATURE_LIST.md lines | Branch |
| --- | --- | --- | --- | --- | --- |
| STEP_00 | Foundation and governance | — | — | — | `kd/step-00-foundation` |
| STEP_01 | Brand and design system | 450 | 1–450 | 26–552 | `kd/step-01-design-system` |
| STEP_02 | Authentication | 40 | 451–490 | 556–618 | `kd/step-02-auth` |
| STEP_03 | SMTP, onboarding, settings | 133 | 491–623 | 622–781 | `kd/step-03-smtp-onboarding` |
| STEP_04 | Team, KYC, notifications, plans | 109 | 624–732 | 785–909 | `kd/step-04-team-kyc-plans` |
| STEP_05 | Gateways and invoice core | 145 | 733–877 | 913–1076 | `kd/step-05-invoice-core` |
| STEP_06 | Invoicing, CRM, inventory | 499 | 878–1376 | 1080–1666 | `kd/step-06-crm-inventory` |
| STEP_07 | Payments, MoR, wallet, disputes | 390 | 1377–1766 | 1670–2124 | `kd/step-07-payments` |
| STEP_08 | Client experience | 325 | 1767–2091 | 2128–2508 | `kd/step-08-client-experience` |
| STEP_09 | Integrations and API | 323 | 2092–2414 | 2512–2879 | `kd/step-09-integrations` |
| STEP_10 | Admin, CMS, SEO, marketing | 499 | 2415–2913 | 2883–3452 | `kd/step-10-admin-marketing` |
| STEP_11 | Payroll and accounting | 264 | 2914–3177 | 3456–3769 | `kd/step-11-payroll-accounting` |
| STEP_12 | Security foundation | 273 | 3178–3450 | 3773–4094 | `kd/step-12-security-core` |
| STEP_13 | Storage, media, edge cases | 158 | 3451–3608 | 4095–4276 | `kd/step-13-storage-media` |
| STEP_14 | Deploy, cron, CI, docs | 158 | C-3451–C-3608 | 4277–4445 | `kd/step-14-deploy-cron` |
| STEP_15 | Enhanced security, Zero Trust | 421 | 3609–4029 | 4446–4912 | `kd/step-15-zero-trust` |
| | **Total** | **4,187** | | | |

---

## 2. Execution waves

```
WAVE 0    STEP_00                       must finish and merge first
            |
WAVE 1    STEP_01 -> STEP_02 -> STEP_03 -> STEP_04 -> STEP_05
            sequential, each merges before the next starts
            |
WAVE 2    STEP_06  STEP_07  STEP_08  STEP_09  STEP_10
          STEP_11  STEP_12  STEP_13  STEP_14  STEP_15
            all ten run in parallel, in separate chats, at the same time
            |
WAVE 3    integrator merges 06..15 in numeric order, then the final audit
```

Why this shape: `STEP_01`–`STEP_05` create the code that every later step imports —
design tokens, auth, the money type, the API handler, the storage and email adapters, the
invoice schema. Building them in parallel would mean ten chats each inventing their own
version of the same primitive, which is exactly the duplication this playbook exists to
prevent. From `STEP_06` onward the domains are disjoint, so parallelism is safe.

`STEP_06`–`STEP_15` must **not** import from each other. They import only from
`lib/contracts/`, `lib/` roots created by `STEP_00`–`STEP_05`, and their own directories.
If a step needs something from a sibling domain, it consumes the contract interface and
the integrator wires the real implementation at merge time.

---

## 3. Why 4,187 and not 3,950

`MASTER_PROMPT.md` line 650 declares 3,950 features. That figure is stale. Measured from
the file on disk:

| Fact | Value |
| --- | --- |
| Numbered feature lines | 4,187 |
| Distinct printed IDs | 4,029 (1–4029, no gaps) |
| IDs printed twice | 158 (3451–3608) |

The file has four regions:

| Region | Lines | Features | Printed IDs | Meaning |
| --- | --- | --- | --- | --- |
| A | 1–4094 | 3,450 | 1–3450 | The main run |
| B | 4095–4276 | 158 | 3451–3608 | Storage abstraction, media, Asia features, B2B, edge cases |
| C | 4277–4445 | 158 | 3451–3608 | Deploy, cron, CI gates, docs, observability — **collides with B** |
| D | 4446–4912 | 421 | 3609–4029 | Enhanced security, Zero Trust, conflict prevention |

3,450 + 158 + 158 + 421 = **4,187**. The collision is between regions B and C only.

Because printed IDs are ambiguous for 158 features, **every step is anchored on line
ranges, not on printed IDs.** A step owns `FEATURE_LIST.md` lines, and the line ranges
above are the authoritative scope boundary. Where an ID must be cited for region C, it is
written `C-3451` to `C-3608`.

Decision C2 in `SPEC_CONFLICTS.md` renumbers region C to 4030–4187. `STEP_00` performs that
renumbering inside `docs/feature-manifest.json` only. `FEATURE_LIST.md` is never edited.

---

## 4. Anti-conflict rules (binding)

These are the rules that make parallel work safe. They are enforced by
`scripts/check-step-boundaries.sh`, not by goodwill.

### 4.1 One step, one branch, one owner

`integration` and the `foundation-v1` tag already exist on `origin`:

```
refs/tags/foundation-v1   annotated tag on ece14f0 - the fixed Wave 1 base
origin/integration        all planning docs and the step briefs; its sha advances
                          as each step merges, so never hardcode it
```

Each step runs on its own branch. In a hosted agent environment the branch is assigned for
you (for example `arena/<id>-kdp2`) and you cannot rename it, so work on the branch you
were given. On a plain local clone, cut the branch yourself:

```
git fetch origin --tags
git checkout -b kd/step-NN-slug foundation-v1
```

Either way the base content must be `foundation-v1` (Wave 1) or `foundation-v2` (Wave 2).
Never work on `main`. Never work on another step's branch. Never merge your own branch.
Every step PR targets `integration`, never `main`.

### 4.2 Exclusive file ownership

`docs/execution/FILE_OWNERSHIP.md` lists, for every path in the repository, exactly one
owner. A step may create and edit **only** paths it owns. Touching a path owned by another
step or by the integrator is a hard failure — the boundary guard rejects the commit.

### 4.3 Never edit a shared file

`package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.mjs`, `.eslintrc.json`,
`.gitignore`, `.env.example`, `netlify.toml`, `middleware.ts`, `app/globals.css`,
`app/layout.tsx`, `.github/**` and `config/nav-map.ts` are owned by `STEP_00`.

Instead of editing them, write a request file that only you own:

```
integrator/requests/step-NN.json
```

with the shape defined in `docs/execution/CONTRACTS.md`. The integrator merges all
requests in step order. This removes the single largest source of merge conflicts, which
is ten chats editing the same dependency list.

### 4.4 Migration numbers are pre-allocated

| Step | Migration prefix | Range |
| --- | --- | --- |
| STEP_00 | `0000`–`0099` | platform, audit, security, plans |
| STEP_01 | `0100`–`0199` | |
| STEP_02 | `0200`–`0299` | |
| STEP_03 | `0300`–`0399` | |
| STEP_04 | `0400`–`0499` | |
| STEP_05 | `0500`–`0599` | |
| STEP_06 | `0600`–`0699` | |
| STEP_07 | `0700`–`0799` | |
| STEP_08 | `0800`–`0899` | |
| STEP_09 | `0900`–`0999` | |
| STEP_10 | `1000`–`1099` | |
| STEP_11 | `1100`–`1199` | |
| STEP_12 | `1200`–`1299` | |
| STEP_13 | `1300`–`1399` | |
| STEP_14 | `1400`–`1499` | |
| STEP_15 | `1500`–`1599` | |

Never use a prefix outside your range. Never edit another step's migration. Every
migration needs its `_down.sql` twin.

### 4.5 Enums are created once, by STEP_00

Postgres enums cannot be merged from two branches without conflict, and
`ALTER TYPE ... ADD VALUE` inside a transaction is fragile. `STEP_00` creates every shared
enum in `migrations/0002_enums.sql` with its full value list. Later steps may only add a
value via `ALTER TYPE ... ADD VALUE IF NOT EXISTS` in their own migration range, and must
declare it in their request file so the integrator can order them.

### 4.6 Config is additive, never edited

Navigation, permissions and cron definitions are split into per-step modules that
`STEP_00`'s aggregator imports. You create your own module; you never touch the aggregator.

```
config/nav/<slug>.nav.ts            your routes
config/permissions/<slug>.ts        your permission keys
config/cron/<slug>.cron.ts          your scheduled jobs
```

### 4.7 One feature, one step

`docs/execution/STEP_FEATURES.md` maps every one of the 4,187 features to exactly one
step. If you believe a feature is yours, check that file. If it is not assigned to you, do
not build it — building it creates a duplicate that the coverage audit will flag and the
integrator will have to delete.

### 4.8 Commit and PR discipline

```
feat(step-07): add payment gateway adapter registry
fix(step-07): correct fee rounding in payout engine
```

Scope is always your step code. One logical change per commit. When the step is complete:

```
git push -u origin kd/step-NN-slug
gh pr create --base integration --head kd/step-NN-slug \
  --title "STEP_NN: <name>" --body-file STEP_NN_COMPLETED.md
```

Base branch is `integration`, never `main`. The PR stays a draft until the integrator
picks it up.

---

## 5. Merge order and integration

The integrator is a single person or a single chat. It does, in order:

1. `STEP_00` merges to `integration`, then `integration` is tagged `foundation-v1`.
2. `STEP_01` through `STEP_05` merge in numeric order, one at a time, full verify after each.
3. `foundation-v1` is retagged `foundation-v2` after `STEP_05`. All Wave 2 branches rebase
   onto it before their PR is opened.
4. `STEP_06` through `STEP_15` merge in numeric order. After each merge: `npm run verify`,
   `npm run verify-db`, `npm run build`. A red gate blocks the next merge.
5. All `integrator/requests/step-*.json` are applied in step order.
6. Final audit: `docs/feature-coverage.md` must read 4,187 of 4,187.

Because every step wrote only to its own paths, steps 4 and 5 are expected to merge
without conflicts. If a conflict appears, it means a boundary rule was broken; fix the
branch, do not resolve the conflict by hand-editing another step's file.

---

## 6. Per-step exit gate

A step is not finished until every line below is true and the output is pasted into its
`STEP_NN_COMPLETED.md`:

```
npm run typecheck     exit 0
npm run lint          exit 0
npm run build         exit 0
npm run verify        exit 0   (all guard scripts, boundary check included)
npm run verify-db     exit 0   (migrations up and down against PGlite)
```

Plus:
- `docs/feature-coverage.md` shows your step's features as implemented, none skipped.
- No `any`, no `console.log`, no TODO/FIXME, no "Coming Soon", no test files.
- Every new table has the five base columns, `version`, RLS enabled, a default-deny
  policy and the audit trigger.
- Every file starts with `// path: <its real path>`.
- `STEP_NN_COMPLETED.md` exists at the repository root with features implemented, files
  created, migrations added, dependencies requested, known issues and the next step's
  starting point.

---

## 7. Starting a new chat for a step

Paste this, and nothing else, as the first message:

```
I am building KD SOLUTION IT.
Read in order: MASTER_PROMPT.md, IMPLEMENTATION_PLAN.md, SPEC_CONFLICTS.md,
docs/execution/README.md, docs/execution/CONTRACTS.md,
docs/execution/FILE_OWNERSHIP.md, docs/execution/STEP_NN_<slug>.md.
My step is STEP_NN. I own only the paths listed for STEP_NN.
Branch: kd/step-NN-slug from foundation-v1.
Begin with batch 1 of STEP_NN and stop when the exit gate passes.
```

Replace `NN` and `<slug>` with your step. Do not paste the whole feature list — the step
document already names the exact `FEATURE_LIST.md` line ranges.
