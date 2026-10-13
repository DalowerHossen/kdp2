ADDENDUM: LOGIN, CARD PAYMENT, FRAUD, VERIFICATION AND PROVIDER CONNECTION RULES
Binding for STEP_02, STEP_07 and STEP_12. Decided by the owner on 2026-10-13.
These override any conflicting older text in MASTER_PROMPT.md, FEATURE_LIST.md or step briefs.
Before writing code, record each override in SPEC_CONFLICTS.md as its own commit.
If a rule cannot be applied as written, or conflicts with a spec text you cannot resolve, STOP and ask. Do not choose silently.
Check FILE_OWNERSHIP.md before writing any file. If a screen or file is not assigned to your step, STOP and ask.

SECTION 1 — LOGIN LOCKOUT (STEP_02)
1.1 Two failed attempts (wrong password or wrong 2FA code) on the same account lock that account for 2 hours.
1.2 While locked: login is refused even with the correct password, and password reset is refused.
    Changing the password does not unlock the account.
1.3 An email alert is sent to the account owner when the lock starts.
1.4 Only super_admin or admin_staff with the unlock permission may unlock early. Unlock is allowed only after the admin has confirmed contact with the account owner by email. Each unlock is written to the audit log with admin ID, reason and timestamp.
1.5 Failure counters and lock state are stored in Postgres, checked on every login attempt, and survive restarts.
1.6 Per-IP rate limiting applies in addition to the per-account lock.
1.7 Error messages are generic. They never reveal whether an account exists or is locked.

SECTION 2 — CARD PAYMENT RULES (STEP_07)
2.1 Card number, expiry and CVV are entered ONLY inside the processor's hosted fields. Application code must never read, log, store or track keystrokes or mouse events in those fields.
2.2 The server never receives, logs or stores a card number (PAN) or CVV, even encrypted.
2.3 Duplicate-payment block: after one successful card payment against an invoice, the same card token cannot pay the same invoice again for 24 hours. Enforce in the database (constraint or guard) and in the payment service. Every payment request requires an idempotency key.
2.4 Decline counter: count declines caused by card data or authentication (wrong card number, wrong CVV, wrong OTP or 3DS failure) per card token within a rolling 24 hours. Insufficient-funds declines are NOT counted. After 2 counted declines, the 3rd attempt with that card token is refused.
2.5 A processor fraud signal, or an entry on the internal blocklist, causes an immediate reject. The blocklist is keyed on the processor card fingerprint or token, never on the card number.
2.6 Velocity limit: too many payment attempts per card token or per IP within a configured window are refused. Defaults go in config and are stated in the completion report.
2.7 Money is USD only, stored as numeric(18,4). Never use JavaScript Number for money. Totals reconcile to the cent.
2.8 Processor webhooks are signature-verified before any state change and are idempotent.

SECTION 3 — VERIFICATION (STEP_07)
3.1 Request 3D Secure whenever the processor and issuer support it.
3.2 If 3DS is not completed, the payment is captured only when billing postal code AND payer IP country both match the invoice data. Use the processor's AVS result for the postal code and a geo-IP check for the IP.
3.3 Any mismatch sends the payment to a manual review queue. The payment is not captured. This is manual review, not automatic blocking.
3.4 VPN, proxy and Tor checks from MASTER_PROMPT apply on every payment page.

SECTION 4 — PAYMENT PROVIDERS (STEP_07) — REPLACES THE PREVIOUS SECTION 4
4.1 Providers in scope, each behind its own adapter in lib/payments/adapters/<provider>.ts:
    NMI, Stripe, FastSpring, Verifone (2Checkout), PayPro Global, BlueSnap, Braintree, Payoneer, Square, Adyen, Paddle.
    Out of scope unless the owner confirms: Payarc/PaymentCloud, Rapyd, standalone PayPal.
4.2 Build order: NMI and Stripe first, fully working end to end. Then the other nine, one adapter per commit.
4.3 Source of truth: before writing an adapter, read that provider's CURRENT official API documentation on the provider's own website. Record the documentation URL and the date read in the commit message and the completion report. Do not write from memory.
4.4 If the documentation cannot be reached, mark that adapter "blocked: documentation not reachable" and move on. Never guess endpoints, field names, signatures or status values.
4.5 NMI Collect.js: read NMI's own Collect.js documentation for the exact script URL, field setup, callback and token flow. Implement exactly as documented. The server charges the returned token. The server-side security key is held only in environment variables. The page is served over HTTPS.
4.6 Stripe: read Stripe's current documentation for Payment Intents, Elements and webhook signature verification.
4.7 Each adapter declares its business model in code: "acquirer" or "merchant_of_record". The payment service must never charge the same invoice through two providers. Every payment records which provider processed it.
4.8 All adapters implement the same interface: charge, capture, void, refund, parse and verify webhook, look up status, health check. An operation the provider does not support returns a typed "not supported" error. It must never be a silent no-op.
4.9 Money: amounts come from the invoice in USD, stored as numeric(18,4). Each adapter converts to the provider's format explicitly and rejects any amount that does not convert exactly.
4.10 Sandbox and live are chosen per provider in the admin dashboard (Section 6), never by code change.
4.11 Section 2 card-data rules apply to every provider's hosted fields.
4.12 Routing default (owner to confirm): a payment is routed to an enabled provider by a routing-rule table editable by super_admin. If no rule matches, the payment is REFUSED. It is never silently sent to another provider.

SECTION 5 — FORBIDDEN IN THESE STEPS
- Any keystroke, mouse or typing capture on card fields.
- Storing PAN or CVV in any form.
- Naming bKash, Nagad, GCash or UPI anywhere. Use "Global Payout Partners" or "Local Payment Methods via Licensed Partners".
- Test files, TODO, FIXME, "Coming Soon", placeholders, `any`, `console.log`.
- Fixing a failing gate by weakening a control. Record the control as blocked instead.

SECTION 6 — SUPER ADMIN PROVIDER CONNECTION (STEP_07 screen; confirm assignment in FILE_OWNERSHIP first)
6.1 Only super_admin can open the Payment Providers page. Opening or changing credentials requires 2FA and a fresh step-up re-authentication.
6.2 The page lists every adapter in the code registry. The admin selects a provider, enters the fields defined by that adapter's credential schema, selects sandbox or live, and clicks "Test connection". The test calls the provider's read-only or health operation and shows pass, or the provider's error code.
6.3 Credentials are encrypted with AES-256-GCM before they reach the database. The key comes from the environment, never from the database. Saved credentials are never shown again. The UI shows only a masked suffix and a last-updated time.
6.4 A provider can be enabled only after a successful test. Enable, disable, mode change and credential change are each written to the audit log with actor, timestamp, provider and mode.
6.5 The UI cannot add a provider that has no adapter in code. The UI contains no provider-specific logic. It reads the adapter's credential schema.
6.6 Changing credentials requires no document change and no redeploy.

SECTION 7 — PROOF OF WORK
7.1 Each adapter's completion entry lists: documentation URL, date read, endpoints or operations used, sandbox result with real output, and anything not verified.
7.2 A claim that an adapter works requires real sandbox output. Without sandbox credentials the status is "implemented, not verified live". Never "complete".
7.3 STEP_07_COMPLETED.md lists every rule in Sections 2 to 7 as "implemented" or "blocked", with the file path that enforces it.
