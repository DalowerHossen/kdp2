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

SECTION 4 — PAYMENT PROVIDERS (STEP_07)
REPLACES SECTION 4 OF ALL EARLIER BLOCKS. Sections 1, 2, 3, 5, 6 and 7 are unchanged.

4.1 Providers in scope from the start. Each has its own adapter file in lib/payments/adapters/<provider>.ts.
    Official documentation links are listed in 4.2. Every provider is in scope; none is optional.

4.2 PROVIDER LIST, DOCUMENTATION AND SANDBOX LINKS (starting points; verify each on the provider's own site)

    1. Stripe
       API:      https://stripe.com/docs/api
       Testing:  https://stripe.com/docs/testing

    2. NMI
       Collect.js:  https://docs.nmi.com/docs/collectjs
       API:         https://docs.nmi.com/
       Sandbox:     https://docs.nmi.com/docs/testing-sandbox
       Index for agents: https://docs.nmi.com/llms.txt

    3. Adyen
       API:      https://docs.adyen.com/
       Testing:  https://docs.adyen.com/development-resources/testing/

    4. Verifone (2Checkout)
       API:      https://docs.verifone.com/
       Sandbox:  https://www.verifone.com/development-partner

    5. Braintree (PayPal)
       API:      https://developer.paypal.com/braintree/docs
       Sandbox:  https://developer.paypal.com/braintree/help/sandboxHelp

    6. BlueSnap
       API:      https://developers.bluesnap.com/
       Index for agents: https://developers.bluesnap.com/llms.txt
       Test mode: NOT https://developers.bluesnap.com/docs/test-mode (returns 404). Find the correct test-mode page in the index above.

    7. Square
       API:      https://developer.squareup.com/docs
       Sandbox:  https://developer.squareup.com/docs/testing/sandbox

    8. Payoneer
       API:      https://developer.payoneer.com/docs/payoneer-api-reference
       Portal:   https://developer.payoneer.com/

    9. FastSpring
       API:      https://developer.fastspring.com/reference/api-overview
       Sandbox:  not provided. Find it in the FastSpring docs and record it.

    10. Paddle
        API:      https://developer.paddle.com/
        Sandbox:  https://developer.paddle.com/sdks/sandbox/

    11. PayPro Global
        API:      https://developers.payproglobal.com/docs/api/overview/
        Sandbox:  not provided. Find it in the PayPro Global docs and record it.

    12. PayPal (standalone)
        API:      https://developer.paypal.com/api/rest/
        Sandbox:  https://developer.paypal.com/sandbox-testing/overview

    13. Payarc / PaymentCloud
        Docs:     https://docs.payarc.net/
        Sandbox:  not provided. Find it in the Payarc docs and record it.

    14. Rapyd
        Docs:     https://docs.rapyd.net/
        Sandbox:  not provided. Find it in the Rapyd docs and record it.

    15. Authorize.Net
        API:           https://developer.authorize.net/api/reference/index.html
        Sandbox info:  https://developer.authorize.net/hello_world/sandbox.html
        Testing guide: https://developer.authorize.net/hello_world/testing_guide.html

    16. Custom
        Generic adapter for an owner-defined HTTPS gateway. No provider-specific behaviour is hardcoded.

4.3 If a listed link returns 404 or an error, search that provider's documentation index (llms.txt where present) for the correct page. Record the corrected URL. Do not guess.
4.4 Build order: Stripe and NMI first, end to end. Then the remaining providers in the numbered order in 4.2. Each provider is its own sub-batch with its own gate run and its own commit.
4.5 Source of truth: before writing any adapter, read that provider's CURRENT official documentation. Record the URL and the date read in the commit message and in STEP_07_COMPLETED.md. Do not write from memory.
4.6 If the documentation cannot be reached or read, mark that adapter "blocked: documentation not reachable", with the URLs attempted, and continue with the next adapter. Never guess endpoints, field names, signatures, status values or error codes.
4.7 NMI — TWO FRONTEND MODES, BOTH KEPT. Each mode is selectable by super_admin.

    MODE A — "collectjs"  (default)
    - Documentation: https://docs.nmi.com/docs/collectjs
    - Use the script URL and field setup exactly as in that page.
    - Collect.js tokens are single-use and expire 24 hours after creation.
      A token is never submitted twice. An expired token is rejected with a typed error.

    MODE B — "payment_component"
    - Documentation: https://docs.nmi.com/docs/payment-component
    - Packages: @nmipayments/nmi-pay (vanilla JS) and @nmipayments/nmi-pay-react (React).
      Use the package matching the stack of the checkout page.
    - Use the onChange handler when 3D Secure is needed, as the documentation states.
    - The public tokenization key is frontend-safe. Obtain it as the documentation describes.
    - Adding these packages is an integrator request (package.json is integrator-owned).
      Record the request in integrator/requests/step-07.json.

    BOTH MODES:
    - The server charges the returned payment token through ONE shared server-side NMI charge module,
      calling the NMI REST API sale endpoint as documented at
      https://docs.nmi.com/reference/create-sale-v5.
    - The private security key is held only in environment variables. It never appears in client code,
      the repository, logs or chat.
    - The page is served over HTTPS.
    - Section 2 card-data rules apply to both modes. The server never receives a card number or CVV.

4.8 NMI MODE SELECTION RULES
4.8.1 The active mode is stored per NMI provider in the provider registry (Section 4.16).
4.8.2 Only one mode is active per NMI provider at a time.
4.8.3 Switching mode requires a successful "Test connection" in the NEW mode first (Section 6.2).
4.8.4 Every mode change is written to the audit log with actor, timestamp, old mode and new mode.
4.8.5 The mode selector appears only on the Payment Providers page of super_admin (Section 6.1).
4.8.6 Each mode's completion entry in STEP_07_COMPLETED.md lists: documentation URL, date read,
      endpoints used, and sandbox result with real output. Status is "implemented, not verified live"
      if no sandbox credentials were available.
4.9 Stripe: follow Stripe's current documentation for Payment Intents, Elements and webhook signature verification.
4.10 All other providers: follow each provider's own documented hosted-field, redirect, token or API flow. For every provider, the application server must never receive a card number or CVV (Section 2.2).
4.11 Each adapter declares its business model in code: "acquirer" or "merchant_of_record". The payment service must never charge the same invoice through two providers. Every payment records which provider processed it.
4.12 All adapters implement one interface: charge, capture, void, refund, verify and parse webhook, look up status, health check. An operation the provider does not support returns a typed "not supported" error. It is never a silent no-op.
4.13 Webhooks are verified with the method that provider documents. Unverified webhooks are rejected and logged. Processing is idempotent.
4.14 Money: amounts come from the invoice in USD, stored as numeric(18,4). Each adapter converts to the provider's format explicitly and rejects any amount that does not convert exactly.
4.15 Routing (owner confirmed): a payment is routed to an enabled provider by a routing-rule table editable by super_admin. If no rule matches, the payment is REFUSED. It is never silently sent to another provider.
4.16 A single provider registry file lists every adapter. The super admin dashboard (Section 6) reads this registry. Adding a provider later requires only its adapter file and one registry entry.
4.17 Sandbox and live modes are chosen per provider in the dashboard (Section 6), never by code change.
4.18 If the step cannot finish in one chat, use RESUME MODE. Do not drop any provider. Unfinished providers are listed in STEP_07_COMPLETED.md as "pending" with the reason, never as "done".

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
