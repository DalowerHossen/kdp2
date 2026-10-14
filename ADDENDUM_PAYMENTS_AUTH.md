<!-- path: ADDENDUM_PAYMENTS_AUTH.md -->
# KD SOLUTION IT — Addendum: Payment Processors, Auth Lock, Card Risk, Storage

Status: BINDING PLANNING DIRECTIVE. Recorded 2026-10-14. No code has been written yet.
This file did not exist before 2026-10-14; earlier planning notes referenced it as if it
did. It is created now with the exact content those notes describe.

**Authority and precedence.** This addendum is decided by the project owner and is
binding on `STEP_02`, `STEP_05`, `STEP_07`, `STEP_08`, `STEP_10`, `STEP_12`, `STEP_13`,
`STEP_15` and the integrator. `FEATURE_LIST.md` is never edited (decision C4). Where a
rule here contradicts an existing document, the contradiction is not silently resolved —
it is listed by feature ID / file / line in §10 and §12, and **this addendum wins**
until the integrator folds these decisions into the governed documents. The mechanics of
that fold-in (edits to `docs/execution/CONTRACTS.md`, `docs/execution/FILE_OWNERSHIP.md`
and `SPEC_CONFLICTS.md`, all integrator-owned) are integrator actions listed in §9.

Decision IDs in this file: `P-01` … `P-11`. All eleven are FINAL — `P-09` … `P-11` were
decided by the owner on 2026-10-14, resolving the former `OPEN-1` … `OPEN-3` items whose
audit trail is kept in §10. Every decision row names its consequences in code.

---

## 1. P-01 — Official documentation must be read before any adapter code is written

This rule is absolute. It exists to make silent API drift impossible.

1. Before writing code for any payment processor, the builder **must read that
   processor's own official documentation from the internet, in a fresh session**, at
   implementation time. Coding from memory, from training data, or from third-party
   summaries is forbidden, even when the API feels well known.
2. For every documentation read, the **URL and the read date** must be recorded:
   - in the commit message body of every commit that implements against those docs, and
   - in the documentation table inside `STEP_07_COMPLETED.md` (see §11).
3. If a recorded link is broken, the builder must find the processor's documentation
   index — for example its `llms.txt` where the vendor offers one, or its docs sitemap /
   table of contents otherwise — locate the correct page, and record the corrected URL
   alongside the broken one.
4. If a processor's documentation cannot be read at all (paywall, signup wall we cannot
   pass, outage, or network restriction), that adapter is registered with status
   **`blocked`**, and:
   - no endpoint URL, field name, signature scheme, status code or webhook event name may
     be guessed;
   - the blocked adapter ships only its registry entry carrying the `blocked` status and
     the reason;
   - blocked adapters do **not** reduce feature coverage, because adapters are
     implementation artifacts of existing generic gateway features, not feature IDs
     themselves (see §2.4).
5. The drafting sandbox used for this addendum had network egress limited to
   `github.com`, `codeload.github.com`, `api.github.com`, `registry.npmjs.org`,
   `pypi.org` and `files.pythonhosted.org`. No processor documentation could be fetched
   while writing this file. Every URL in §4.2 is therefore a **canonical seed URL from
   prior knowledge, marked `unverified`**, and Section 1 obliges the implementation
   session to re-read and either verify or correct each one.

---

## 2. P-02 — The processor registry: exactly 16 processors, one adapter file each

### 2.1 The 16 processors

| # | Processor | Adapter ID | New to the spec? |
| --- | --- | --- | --- |
| 1 | Stripe | `stripe` | no (features 1261–1278) |
| 2 | NMI | `nmi` | no (features 1296–1305, plus P-03) |
| 3 | Adyen | `adyen` | no (features 1317–1328) |
| 4 | Verifone (2Checkout) | `verifone2co` | **yes** |
| 5 | Braintree (PayPal) | `braintree` | **yes** |
| 6 | BlueSnap | `bluesnap` | **yes** |
| 7 | Square | `square` | **yes** |
| 8 | Payoneer | `payoneer` | **yes** |
| 9 | FastSpring | `fastspring` | **yes** |
| 10 | Paddle | `paddle` | no (features 1289–1295) |
| 11 | PayPro Global | `payproglobal` | **yes** |
| 12 | PayPal (standalone) | `paypal` | no (features 1279–1288) |
| 13 | Payarc / PaymentCloud | `payarc` | **yes** |
| 14 | Rapyd | `rapyd` | no (features 1306–1316) |
| 15 | Authorize.Net | `authorizenet` | **yes** |
| 16 | Custom | `custom` | no (features 1253, 1335–1352) |

All sixteen are in the plan **from day one**. Nothing is "phase 2". An adapter may carry
status `implemented`, `blocked` (§1) or `pending`, but it always has a registry row.

### 2.2 File layout (STEP_07 owns `lib/payment/**`)

```
lib/payment/adapters/base.ts                 GatewayAdapter interface re-exported from contracts
lib/payment/adapters/<adapter-id>.ts         exactly one file per processor (16 files)
lib/payment/adapters/fixture.ts              offline fixture adapter (already required by STEP_07 batch 1)
lib/payment/adapters/registry.ts             the single registry: id, name, status, modes,
                                             credential schema, capability flags (checkout/refund/payout/webhooks)
```

The UI for the super-admin page (§4) is generated **from the registry**, never
hardcoded. A processor without an adapter file cannot appear, which enforces §4.1 rule 8.

### 2.3 Contracts change required (integrator action)

`docs/execution/CONTRACTS.md` §9 defines

```ts
export type GatewayName =
  | 'stripe' | 'paypal' | 'paddle' | 'nmi' | 'rapyd' | 'adyen' | 'custom';
```

It must grow to 16 members with the adapter IDs above, plus:

```ts
export type AdapterStatus = 'implemented' | 'blocked' | 'pending';
export interface AdapterRegistryEntry {
  readonly name: GatewayName;
  readonly status: AdapterStatus;
  readonly blockedReason?: string;
  readonly modes: readonly string[];          // e.g. ['collectjs', 'payment-component'] for nmi
  readonly activeMode: string;
  readonly capabilities: { checkout: boolean; refund: boolean; payout: boolean; webhooks: boolean };
}
```

Because `lib/contracts/**` is integrator/STEP_00-owned, STEP_07 declares this need in
`integrator/requests/step-07.json`; the integrator amends `CONTRACTS.md` and
`lib/contracts/payment.ts` at merge time. The same applies to the nine new webhook route
paths `app/api/webhooks/{verifone2co,braintree,bluesnap,square,payoneer,fastspring,payproglobal,payarc,authorizenet}/**`,
which must be added to STEP_07's ownership block in `FILE_OWNERSHIP.md` by the integrator
(STEP_07 already owns the existing seven under `app/api/webhooks/**`).

### 2.4 Feature coverage does not change

`FEATURE_LIST.md` owns 4,187 features and the final audit must read 4,187 of 4,187
(decision C3). The nine new processors implement **existing** generic features —
gateway keys (733–746), custom/pluggable gateway (1253, 1335–1352), payment initiation,
capture, refund, routing, webhooks (1377–1766 block). **No new feature IDs are created
and none are renumbered.** `docs/feature-coverage.md` therefore still counts 4,187, and
the adapters table in `STEP_07_COMPLETED.md` explains which feature ranges each adapter
exercises. MASTER_PROMPT Rule 5 (generic naming for local payout/collection partners) is
unaffected — the 16 processors are card/merchant processors, not the protected local
brand names.

---

## 3. P-03 — NMI ships with two front-end modes, Collect.js the default

1. **Mode 1 — Collect.js (default, shipped first).** Card data is entered into
   Collect.js fields hosted by NMI and tokenized client-side. The payment token is
   **single-use and expires 24 hours after creation**; server-side code must treat it as
   such and must document that property (verified against the fresh doc read, §1) in the
   adapter header comment.
2. **Mode 2 — Payment Component.** The embedded component arrives as an npm package.
   `package.json` is integrator/STEP_00-owned (FILE_OWNERSHIP), so STEP_07 must **not**
   add it; instead `integrator/requests/step-07.json` carries the dependency request and
   the integrator merges it (playbook rule 4.3). Until that merge, mode 2 stays
   `pending` and mode 1 remains default.
3. Both modes converge on **one shared server module** (`lib/payment/adapters/nmi.ts`)
   that talks to the **NMI REST API**; the modes differ only in how the browser
   tokenizes the card. No logic is duplicated per mode.
4. Mode selection is a **per-processor setting on the super-admin page** (§4):
   - exactly **one mode is active at a time** for a processor;
   - a mode switch is allowed **only after a successful live connection test in the new
     mode** (§4.1 rule 6);
   - every switch is written to the audit log (guaranteed by `defineMutation`,
     CONTRACTS §5) with actor, old mode, new mode and test result.

This sits alongside the existing NMI feature block (1296–1305): Three-Step Redirect
(1297) and Direct Post (1298) remain as server-side flows of the shared module; the two
modes govern the browser surface.

---

## 4. P-04 — Super-admin processor connection page (no redeploy, no hidden keys)

### 4.1 Binding rules

1. The super-admin dashboard contains a page (STEP_07 owns `app/(admin)/gateways/**`)
   from which any processor's API credentials can be **entered, tested, enabled and
   disabled at runtime** — no config-file edits, no redeploy.
2. Only `super_admin` may open the page. Entering it requires an active 2FA-verified
   session (feature 421) and a **step-up re-authentication** for changes, per feature
   422 ("সেনসিটিভ অ্যাকশনে step-up 2FA (gateway change, payout)").
3. Credentials are encrypted with **AES-256-GCM before they are stored** (extends
   feature 733, "গেটওয়ে কী সেটিংস (AES-256 encrypted)"). The encryption key lives in a
   **server-only environment variable** (declared in `integrator/requests/step-07.json`),
   **never in the database**. Key rotation is an operator procedure, not a data column.
4. After save, a secret is **never displayed again**. The page shows only the **last 4
   characters** and the **last-updated timestamp** of each credential.
5. A processor **cannot be enabled unless its connection test has passed** in the
   current mode (feature 745 "গেটওয়ে কানেকশন টেস্ট" is the hook; feature 746 health
   status displays the result). The test-gate applies to first enable and to every mode
   switch (§3.4).
6. The page is registry-driven (§2.2): **a processor whose adapter is not in code cannot
   be added** from the dashboard. Blocked adapters appear disabled with their reason.
7. **Routing terminality:** payment routing evaluates the configured routing rules —
   including KYC-gated MoR routing (features 652, 1512, 1836 block) and the explicitly
   configured gateway fallback order (feature 744). If **no configured rule matches**,
   the payment is **declined** and recorded; it is **never** silently cascaded to
   another processor. Re-routing happens only along rules an administrator has
   deliberately configured.
8. Tenant-level "bring your own key" settings (features 733–746, STEP_05's
   `services/gateway-settings-service.ts`) remain, unchanged in scope: in direct-key
   mode (feature 1263) the tenant's credentials are used; in MoR mode (feature 1512)
   the platform credentials from this page are used. The same encryption (rule 3) and
   no-display (rule 4) requirements apply at both levels.

### 4.2 Documentation and sandbox link table (seed list — ALL rows `unverified`, §1.5)

Every row must be re-read in a fresh session at implementation time; the implementer
records the verified URL + date and replaces `unverified` with `verified: YYYY-MM-DD`.

| # | Processor | Official docs (seed URL) | Sandbox / test access (seed) | Notes from planning |
| --- | --- | --- | --- | --- |
| 1 | Stripe | `https://docs.stripe.com/api` | test-mode keys in the dashboard | — |
| 2 | NMI | `https://www.nmi.com/developers` | sandbox account via NMI developer portal | two front-end modes (§3) |
| 3 | Adyen | `https://docs.adyen.com` | test Customer Area | — |
| 4 | Verifone (2Checkout) | `https://verifone.cloud/docs/2checkout` | 2Checkout sandbox control panel | — |
| 5 | Braintree (PayPal) | `https://developer.paypal.com/braintree/docs` | `https://sandbox.braintreegateway.com` | separate from standalone PayPal |
| 6 | BlueSnap | `https://developers.bluesnap.com` | **previous repo reference had the wrong test-mode URL** | resolve correct page via the vendor docs index (`llms.txt` if offered), record both URLs per §1.3 |
| 7 | Square | `https://developer.squareup.com/docs` | sandbox from Square developer dashboard | — |
| 8 | Payoneer | `https://developer.payoneer.com` | sandbox program — confirm from docs | payout-oriented; confirm checkout scope from docs |
| 9 | FastSpring | `https://developer.fastspring.com` | **sandbox link not in any list — discover from docs** | record discovered link per §1.3 |
| 10 | Paddle | `https://developer.paddle.com` | `https://sandbox-vendors.paddle.com` | — |
| 11 | PayPro Global | `https://docs.payproglobal.com` | **sandbox link not in any list — discover from docs** | record discovered link per §1.3 |
| 12 | PayPal (standalone) | `https://developer.paypal.com/docs` | sandbox accounts from developer dashboard | sandbox existence still treated as `unverified` by rule §1 (see P-11) |
| 13 | Payarc / PaymentCloud | developer portal, locate from `payarc.com` docs index | **sandbox unknown** | per P-11: starts `blocked` until docs confirm docs + sandbox |
| 14 | Rapyd | `https://docs.rapyd.net` | **sandbox link not in any list — discover from docs** | per P-11: verified or `blocked` at implementation time |
| 15 | Authorize.Net | `https://developer.authorize.net/api` | sandbox signup page is protected by reCAPTCHA | **owner must self-register the sandbox account**; record the account (not the password) in the handoff notes |
| 16 | Custom | n/a — tenant-supplied API definition | n/a | JSON-driven, features 1253/1335–1352 |

---

## 5. P-05 — Login lock: two consecutive failures, two-hour lock

**This section supersedes the parameters of feature 440** (`FEATURE_LIST.md` line 542:
"ব্রুট-ফোর্স লকআউট (5 failed → 15 min lock)"). The feature itself remains; its numbers
change. Recorded in §10 and §12.

1. **Trigger.** Two consecutive failed sign-in attempts on an account — a wrong password
   **or** a wrong 2FA code, either factor, counted together — lock the account for
   **2 hours**. Any fully successful sign-in resets the consecutive counter.
2. **While locked:**
   - even the correct password + correct 2FA does **not** sign in;
   - password reset is **disabled** for the account (request accepted silently;
     see rule 6);
   - changing the password (e.g. from a still-active session) does **not** lift the lock.
3. **Owner alerting.** When a lock starts, the account owner is emailed a warning
   (through the email queue, CONTRACTS §8 — never inline) containing the time, the
   lock duration and the lock reason.
4. **Admin unlock.** Only `super_admin`, or `admin_staff` holding the explicit
   `auth.account_unlock` permission (new key in `config/permissions/02-auth.ts`), can
   unlock early — and **only after confirming contact with the account owner over
   email**. The unlock form records that confirmation (`owner_contact_confirmed`,
   timestamp, channel) and **every unlock attempt, granted or refused, hits the audit
   log** (defineMutation, CONTRACTS §5).
5. **Durable state.** The consecutive-failure counter and the lock state live in the
   database (STEP_02's migration range; `auth_login_attempts` or a dedicated table) so a
   server restart cannot clear or inflate them.
6. **No account enumeration.** Login and reset error messages never reveal whether an
   account exists or is locked: identical generic message, identical response shape,
   uniform timing. The owner learns about the lock from the rule-3 email, not from the
   error text.
7. **Unchanged sibling layers.** IP-based login rate limiting (feature 443) and login
   velocity checks (features 442, 3255) remain in force **in addition to** the account
   lock. The exponential-backoff feature (441) continues to govern retry delays before
   the lock triggers; the lock itself is a fixed 2 hours and backoff neither shortens
   nor extends it.

Ownership: `STEP_02` builds the counter, lock, alerting and unlock API
(`app/api/auth/**`, Wave 1, email via contract with integrator wiring to STEP_03's
adapter). The admin-facing unlock screen is a STEP_10 surface consuming that API;
STEP_15's fraud engine receives the lock signal over the contract interface STEP_02
already declares (STEP_02 batch 5).

---

## 6. P-06 — Card acceptance rules (PCI-safe perimeter, per-card hygiene)

1. **No card data on our side.** Card number, expiry and CVV are entered **only into the
   processor's own secure/hosted form** (features 1633–1635, PCI SAQ-A posture). Our
   client code and servers never read, store, log or key-log card data. Per P-09,
   **no keystroke or mouse-behavior tracking exists anywhere on the payment page**;
   inside the processor's own hosted fields such tracking would in any case be
   technically impossible and contractually forbidden.
2. **Same card, same invoice, 24 hours.** Once a card has **successfully** paid an
   invoice, that same card (identified by its processor token/fingerprint, never by
   PAN) cannot pay **that same invoice** again for the next **24 hours**. Other invoices
   are unaffected. Attempts rejected by this rule are recorded and shown a generic
   "try later" message.
3. **Failure budget per card token.** Card-data or authentication failures — wrong
   number, wrong expiry, wrong CVV, wrong OTP, failed 3DS — on one card token: **2
   failures within 24 hours → the 3rd attempt is refused** and the card-token is
   cooled down. **Insufficient-funds declines do not count.** Failure classes are taken
   from the processor's decline codes, mapped per adapter only after the §1 doc read.
4. **Instant rejection signals.** A card token listed on our internal blacklist, or a
   card refused by the **processor's own fraud signal** (e.g. features 1276 Radar /
   1304 NMI fraud scoring class), is rejected immediately, before any other rule runs.
5. **Blacklist keying.** The blacklist stores **processor-issued card tokens or the
   processor's card fingerprint** only — never a card number, never a hash derived from
   a PAN we received (we never receive one, rule 1).
6. **Velocity limits.** Card-token, IP and per-invoice attempt limits exist with
   **defaults held in configuration** (STEP_07-owned module under `lib/payment/**`,
   surfaced in the admin UI, admin-tunable). The shipped defaults (owner-decided, P-10)
   are: **per card token 3 attempts/hour and 5/day; per payer IP 15 attempts/hour and
   50/day; per invoice 3 attempts/hour** — all as explicit config values, never literals
   scattered in code. These attempt limits stack with the failure budget of rule 3.
7. **Money discipline (restated).** All amounts are USD, stored `numeric(18,4)`
   (MASTER_PROMPT Rule 2, CONTRACTS §1–2). No JavaScript `Number` may ever touch a
   monetary value; the money type and `scripts/check-money-types.sh` already enforce
   this. No change, repeated here because it is restated in the owner's requirement.

---

## 7. P-07 — Verification and risk checks

1. **3DS always requested.** 3-D Secure is requested on every payment where the
   processor supports it (features 1645–1646; Stripe 1272, NMI 1297, Adyen 1322 are the
   existing per-adapter hooks). Where the processor offers an SCA/3DS exemption or
   frictionless flow, the exemption decision belongs to the processor, not to us.
2. **When 3DS did not complete**, the payment is captured **only if both** of the
   following match the invoice data:
   - the **billing postal code**, and
   - the **payer IP country** (feature 1642's geo check, generalized).
   If **either** mismatches, the payment is **not captured**; it goes to the **manual
   review queue** (feature 1644) with the mismatch reasons recorded.
3. **VPN / proxy / Tor screening applies on the payment page** (and remains standard on
   auth surfaces via STEP_12/STEP_15). Detection must log its verdict; the disposition
   (block vs. review) follows the same manual-review queue when ambiguous.
4. **Webhooks.** A webhook payload is processed **only after signature verification**
   (CONTRACTS §9) and is handled **idempotently** — replayed events are recorded in
   `webhook_processed_events` and never applied twice. This restates existing contract
   law; no change.

---

## 8. P-08 — File storage rule (restated — no change to C5 / Rule 3)

This section restates what is already decided so the payments/security and storage
discussions share one source of truth:

1. Text and numeric data always live in **Supabase Postgres**.
2. Files (PDFs, images, KYC documents, logos and every other binary) go to the
   **organization's connected Google Drive**; when no Drive is connected, they go to
   **Supabase Storage** (decision C5: per-tenant precedence chain
   `google-drive → supabase-storage`, MASTER_PROMPT Rule 3, CONTRACTS §7).
3. Every file is **AES-256-GCM encrypted before upload**; every file record carries
   `storage_provider`; the provider is chosen **at runtime per organization**; failure
   of one provider falls back to the other automatically; and the **provider-migration
   tool** exists (features 3459–3460). No change. STEP_13 implements.

---

## 9. Execution map — who builds what

| Area | Owner | What changes | Requests/wiring |
| --- | --- | --- | --- |
| 16-adapter registry + adapter files | STEP_07 | §2 layout; `GatewayName` expansion; nine new webhook routes | integrator amends CONTRACTS §9, FILE_OWNERSHIP (STEP_07 block), CSP `connectSrc` per processor post-doc-read |
| NMI dual mode | STEP_07 | Collect.js default; Payment Component | npm package via `integrator/requests/step-07.json` (package.json is integrator-owned) |
| Super-admin connection page | STEP_07 (`app/(admin)/gateways/**`) | §4.1 rules; registry-driven UI | env key for AES-256-GCM vault via request file; step-up 2FA consumes STEP_02 contract |
| Login lock | STEP_02 | §5; extends `auth_login_attempts`; unlock API; permission key | admin UI (STEP_10) consumes API; email via contract → STEP_03 adapter at merge |
| Card hygiene rules 2–6 | STEP_07 (+ STEP_12/15 signals over contracts) | §6 counters, cooldowns, blacklist keyed on token/fingerprint | velocity defaults module in `lib/payment/**` |
| Verification & review queue | STEP_07 (capture gate) + STEP_12/15 (VPN/ Tor intel) | §7 | fraud-signal interfaces via contracts |
| Storage | STEP_13 | none — §8 restates C5 | — |
| Tenant-level key settings | STEP_05 | encryption/no-display parity (§4.1 rules 3–4) | shares the vault env key declared by STEP_07's request |

Integrator fold-in list (when waves merge): CONTRACTS §9 types; FILE_OWNERSHIP STEP_07
webhook paths; `SPEC_CONFLICTS.md` gains a row for the feature-440 parameter override;
STEP_02/STEP_05/STEP_07/STEP_13 briefs gain one-line pointers to this addendum.

---

## 10. Decision sheet

### FINAL (binding now)

| ID | Decision recorded | Consequence in code |
| --- | --- | --- |
| P-01 | Fresh official-doc read before any adapter code; URL+date logged in commits and `STEP_07_COMPLETED.md`; llms.txt/docs-index fallback; unreadable docs → `blocked`, no guessing | registry rows carry status; §11 gate additions |
| P-02 | Exactly 16 processors from day one, one file each, one registry; no new feature IDs | GatewayName = 16 members; registry.ts; coverage stays 4,187 |
| P-03 | NMI has two browser modes; Collect.js default; token single-use/24 h; Payment Component via npm request; one mode active; test-gated, audited switches | `nmi.ts` single server module; mode field on processor settings |
| P-04 | Super-admin page manages credentials/modes at runtime; 2FA + step-up; AES-256-GCM with env-held key; last-4 display only; test-gate before enable; registry-driven; no-match routing = decline | vault env var; masked credential columns; routing engine terminal rule |
| P-05 | 2 consecutive failures (either factor) → 2-hour lock; locked account: no login, no reset, no unlock-by-change; owner email; permissioned admin unlock after email contact + audit; DB-durable counters; no enumeration; IP rate limit + velocity retained | supersedes feature 440 parameters; `auth.account_unlock` permission; STEP_02 tables |
| P-06 | No card data on our side; same-card-same-invoice 24 h reuse block; 2 card/auth failures in 24 h → 3rd refused (insufficient-funds exempt); processor-fraud + blacklist instant reject; blacklist keyed on token/fingerprint; velocity defaults in config (numbers set by P-10) | attempt/failure ledgers keyed by token; decline-code mapping per adapter post-doc-read |
| P-07 | 3DS requested whenever possible; no-3DS capture requires postal AND IP-country match else manual review; VPN/proxy/Tor screening on payment page; signed, idempotent webhooks | capture gate + review queue reasons |
| P-08 | Storage rule stands as decided in C5 / Rule 3 / CONTRACTS §7 | restated; no change |
| P-09 | **No keystroke or mouse-behavior tracking anywhere on the payment page** (owner decision 2026-10-14; planning recommendation accepted) | zero behavioral instrumentation; adapter boundary types unchanged; PCI SAQ-A posture (features 1633–1637) unchanged |
| P-10 | **Strict velocity defaults** (owner decision 2026-10-14): per card token 3 attempts/hour and 5/day; per payer IP 15 attempts/hour and 50/day; per invoice 3 attempts/hour — all in config, admin-tunable | default constants in the STEP_07-owned config module under `lib/payment/**`; no code literals |
| P-11 | **All 16 processors stay in the plan; unconfirmed sandboxes start `blocked`** (owner decision 2026-10-14): sandbox existence is verified from fresh official docs at implementation time; any processor whose sandbox cannot be confirmed enters the registry as `blocked`; Authorize.Net sandbox is self-registered by the owner (§4.2 row 15) | registry statuses per §1.4; §4.2 rows updated with verified links and dates |

### Resolved open items — audit trail (all decided by the owner on 2026-10-14)

| ID | Question | Planning recommendation | Owner's decision |
| --- | --- | --- | --- |
| OPEN-1 | Track keystrokes/mouse behavior around card entry? | No tracking at all (hosted fields are processor iframes — tracking inside them is technically impossible; page-level tracking adds PCI-privacy risk for little fraud gain) | **Accepted — no tracking anywhere** → P-09 |
| OPEN-2 | Velocity-limit numbers (§6.6)? | Balanced preset (card token 5/h + 10/d; IP 30/h + 100/d; invoice 5/h) | **Strict preset chosen instead** (card token 3/h + 5/d; IP 15/h + 50/d; invoice 3/h) → P-10 |
| OPEN-3 | Payarc, Rapyd and standalone PayPal sandbox availability unconfirmed | Keep all 16; unconfirmed ones start `blocked` until verified from official docs | **Accepted as recommended** → P-11 |

---

## 11. Exit-gate and handoff additions

In addition to every existing gate (`docs/execution/README.md` §6, STEP_07 brief §7):

1. `STEP_07_COMPLETED.md` must contain a **documentation table**: processor → each doc
   URL read → read date → status (`verified`, `corrected-from`, `blocked` + reason).
   Commit messages implementing an adapter cite the same URLs (§1.2).
2. The **adapter registry table** (16 rows, status per row) is pasted into
   `STEP_07_COMPLETED.md`; `blocked` rows name their reason and the §1 step that failed.
3. A grep proving **no PAN/CVV field names** exist outside adapter boundary types
   (P-06.1) is pasted into the handoff.
4. The **feature-440 supersession** (P-05) is listed under "known divergences from
   FEATURE_LIST.md" in `STEP_02_COMPLETED.md`, citing this file's §10.
5. The integrator records the §9 fold-in list as completed before the final coverage
   audit runs.

---

## 12. Verified-against-repository appendix (planning accuracy proof)

Checked on 2026-10-14 against branch `arena/60759d4a-kdp2` (HEAD `c584911`):

| Claim used above | Where verified |
| --- | --- |
| Repo contains planning docs only; no code yet | `IMPLEMENTATION_PLAN.md` §0.1–0.2 |
| 4,187 features / 4,029 IDs / renumber 4030–4187 | `SPEC_CONFLICTS.md` C2–C3; `docs/execution/README.md` §3 |
| Existing 7 adapters in `GatewayName` | `docs/execution/CONTRACTS.md` §9 |
| Existing gateway feature blocks | `FEATURE_LIST.md` lines 914–920 (733–740), 1537–1610 (1261–1328) |
| Tenant gateway config features 733–746 | `FEATURE_LIST.md` lines 914–925 |
| Custom gateway features 1253, 1335–1352 | `FEATURE_LIST.md` lines 1529, 1556+ / 1611+ region |
| Step-up 2FA on gateway change (421–422) | `FEATURE_LIST.md` lines 521–522 |
| Feature 440 original parameters "5 failed → 15 min lock" | `FEATURE_LIST.md` line 542 |
| Features 441–446 (backoff, velocity, IP limit, HIBP, policy) | `FEATURE_LIST.md` lines 543–548 |
| PCI SAQ-A / no card data features 1633–1637 | `FEATURE_LIST.md` lines 1976–1980 |
| Fraud/velocity/review features 1638–1646 | `FEATURE_LIST.md` lines 1981–1989 |
| MoR routing 1512; KYC-gating 652 + 1836 block | `FEATURE_LIST.md` lines 815, 1830, 1836 |
| Fallback-order feature 744 | `FEATURE_LIST.md` line 923 |
| Storage C5 precedence + `storage_provider` + migration tool | `SPEC_CONFLICTS.md` C5; `CONTRACTS.md` §7; features 3459–3460 |
| Ownership: STEP_02 auth, STEP_05 gateway settings service, STEP_07 `app/(admin)/gateways/**` + 7 webhook paths, STEP_13 storage | `docs/execution/FILE_OWNERSHIP.md` |
| `package.json` is integrator/STEP_00-owned; changes via `integrator/requests/step-NN.json` | `docs/execution/FILE_OWNERSHIP.md`; `docs/execution/README.md` §4.3; `CONTRACTS.md` §12 |
| English-only / USD-only / no-PAN posture | `MASTER_PROMPT.md` Rules 1–3, 5; STEP_07 §7 |
| This file did not previously exist; `STEP_07_COMPLETED.md` does not exist yet (STEP_07 unbuilt) | repository file inventory |
| Planning sandbox egress limited to github/npm/pypi — §4.2 URLs unverifiable now | `IMPLEMENTATION_PLAN.md` §0.3 |
