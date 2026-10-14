<!-- path: docs/execution/CONTRACTS.md -->
# KD SOLUTION IT — Cross-Step Contracts

Everything in this file is created once by `STEP_00` and consumed by every other step.
Steps implement these interfaces. Steps never redefine them and never edit
`lib/contracts/**`.

The point of this document is that ten chats building in parallel produce code that fits
together, because the seams are fixed before anyone writes a line.

---

## 1. Base table shape

Every table created by any step has these columns, in this order, and nothing less:

```sql
id          uuid         primary key default uuid_generate_v7(),
company_id  uuid         null,               -- null only for platform-level tables
created_at  timestamptz  not null default now(),
updated_at  timestamptz  not null default now(),
deleted_at  timestamptz  null,
version     integer      not null default 0
```

Plus, for every table without exception:

```sql
create index idx_<table>_company_id  on <table> (company_id);
create index idx_<table>_created_at  on <table> (created_at);
alter table <table> enable row level security;
alter table <table> force row level security;
-- default-deny catch-all: PERMISSIVE with qual false grants nothing to
-- anyone, and with RLS's default-deny when no other permissive policy
-- matches, the table stays sealed. An earlier draft said `as restrictive`;
-- that is wrong for this sample: a restrictive false policy denies every
-- row even when another policy explicitly allows it. The named policy is
-- also the stable anchor the verify gates assert on (deny_all_<table>,
-- qual false). A step then adds its own explicit permissive policies for
-- the roles that need access.
create policy deny_all_<table> on <table> as permissive for all to public
  using (false) with check (false);
create trigger trg_<table>_audit after insert or update or delete on <table>
  for each row execute function audit_trigger();
create trigger trg_<table>_updated before update on <table>
  for each row execute function set_updated_at();
```

Unique constraints are always partial: `... where deleted_at is null`.

Money columns are always `numeric(18,4) not null`. Never `float`, never `double
precision`, never bare `numeric`.

---

## 2. Money

```ts
// lib/contracts/money.ts
export interface Money {
  readonly amount: string;   // decimal string, never a JS number
  readonly currency: 'USD';
}
export interface MoneyOps {
  fromDecimal(value: string): Money;
  add(a: Money, b: Money): Money;
  subtract(a: Money, b: Money): Money;
  multiply(a: Money, factor: string): Money;
  divide(a: Money, divisor: string): Money;
  allocate(a: Money, ratios: readonly string[]): readonly Money[];
  isZero(a: Money): boolean;
  isNegative(a: Money): boolean;
  compare(a: Money, b: Money): -1 | 0 | 1;
  format(a: Money, opts?: { symbol?: boolean }): string;
  toDb(a: Money): string;      // numeric(18,4) literal
  fromDb(raw: string): Money;
}
```

Rounding is half-up at 4 decimal places for storage and half-up at 2 for display.
Allocation is remainder-safe: `allocate` results always sum exactly to the input.
No function in `lib/`, `services/` or `app/api/` may accept or return a `number` for a
monetary value. `scripts/check-money-types.sh` enforces this.

---

## 3. Errors

```ts
// lib/contracts/errors.ts
export type ErrorCode =
  | 'validation_failed' | 'unauthorized' | 'forbidden' | 'not_found'
  | 'conflict' | 'version_conflict' | 'duplicate' | 'rate_limited'
  | 'idempotency_replay' | 'approval_required' | 'storage_failed'
  | 'gateway_failed' | 'internal';

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;            // English, user-safe
    details?: ReadonlyArray<{ field: string; message: string }>;
    correlation_id: string;
  };
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: ReadonlyArray<{ field: string; message: string }>;
  readonly correlationId: string;
}
```

Subclasses: `ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`,
`ConflictError`, `VersionConflictError`, `DuplicateError`, `RateLimitedError`,
`ApprovalRequiredError`, `StorageError`, `GatewayError`.

Internal error text never reaches a response body. It goes to the logger and to Sentry
with PII scrubbed.

---

## 4. HTTP handler

```ts
// lib/contracts/http.ts
export interface RequestContext {
  readonly correlationId: string;
  readonly actor: ActorContext;
  readonly tenantId: string | null;
  readonly ip: IpVerdict;
  readonly startedAt: number;
}

export interface ActorContext {
  readonly userId: string;
  readonly companyId: string | null;
  readonly role: RoleName;
  readonly subRole: AdminSubRole | null;
  readonly permissions: ReadonlySet<string>;
  readonly twoFactorVerified: boolean;
  readonly stepUpVerified: boolean;
}

export type RouteHandler<TInput, TOutput> = (
  input: TInput,
  ctx: RequestContext,
) => Promise<TOutput>;

export interface RouteOptions<TInput> {
  readonly schema: ZodType<TInput>;
  readonly permission: string;
  readonly rateLimit: { windowSeconds: number; max: number };
  readonly idempotent?: boolean;
  readonly approvalLevel?: 1 | 2 | 3;
  readonly stepUp?: boolean;
  readonly audit: { action: string; resource: string };
  readonly runtime?: 'nodejs' | 'edge';
}

export function defineRoute<TInput, TOutput>(
  options: RouteOptions<TInput>,
  handler: RouteHandler<TInput, TOutput>,
): { GET?: NextHandler; POST?: NextHandler; PUT?: NextHandler;
     PATCH?: NextHandler; DELETE?: NextHandler };
```

`defineRoute` applies, in order: correlation ID, network guard, auth, permission check,
rate limit, Zod parse, sanitization, idempotency lookup, step-up check, approval
requirement, the handler, audit write, and error mapping. A route handler written by any
step must go through `defineRoute`. Reading `request.json()` directly is forbidden.

---

## 5. Service mutation base

```ts
// lib/contracts/service.ts
export interface MutationOptions<TInput, TOutput> {
  readonly action: string;
  readonly resource: string;
  readonly table: string;
  readonly idempotencyKey?: (input: TInput, ctx: RequestContext) => string;
  readonly optimisticLock?: boolean;      // default true
  readonly approvalLevel?: 1 | 2 | 3;
  readonly duplicateCheck?: (input: TInput, ctx: RequestContext) => Promise<string | null>;
}

export function defineMutation<TInput, TOutput>(
  options: MutationOptions<TInput, TOutput>,
  body: (input: TInput, ctx: RequestContext) => Promise<TOutput>,
): (input: TInput, ctx: RequestContext) => Promise<TOutput>;
```

`defineMutation` guarantees: an audit row on success and on failure, an idempotency
record when a key is supplied, a `version` check and increment when optimistic locking is
on, and a `DuplicateError` when `duplicateCheck` returns a hash that already exists.

Optimistic locking is always `where id = $1 and version = $2` with `version = version + 1`
in the same statement. A zero-row update raises `VersionConflictError`, which the UI shows
as "Another user edited this record".

---

## 6. Roles and approval

```ts
// lib/contracts/auth.ts
export type RoleName = 'super_admin' | 'ceo' | 'admin_staff' | 'owner' | 'staff';
export type AdminSubRole =
  | 'kyc_reviewer' | 'payment_processor' | 'support_agent' | 'content_manager'
  | 'compliance_officer' | 'fraud_analyst' | 'finance_analyst';
export type ApprovalLevel = 1 | 2 | 3;

export interface ApprovalRequest {
  readonly id: string;
  readonly level: ApprovalLevel;
  readonly action: string;
  readonly payloadHash: string;
  readonly requestedBy: string;
  readonly dualApproval: boolean;
  readonly slaDueAt: string;
}

export interface ApprovalEngine {
  levelFor(action: string, actor: ActorContext): ApprovalLevel;
  submit(request: ApprovalRequest, ctx: RequestContext): Promise<ApprovalRequest>;
  approve(id: string, ctx: RequestContext): Promise<void>;
  reject(id: string, reason: string, ctx: RequestContext): Promise<void>;
  delegate(fromUserId: string, toUserId: string, until: string): Promise<void>;
}
```

L1 is the owner or `staff` drafting, L2 is `ceo`, L3 is `super_admin`. Every action
resolves to a level through `levelFor`; nothing is hardcoded at the call site.
`super_admin > ceo > admin_staff > owner > staff`. Clients have no role and no login;
they hold HMAC tokens.

---

## 7. Storage

```ts
// lib/contracts/storage.ts
export type StorageProvider = 'google-drive' | 'supabase-storage';

export interface StoredFile {
  readonly id: string;
  readonly companyId: string;
  readonly provider: StorageProvider;
  readonly externalId: string;
  readonly category: FileCategory;
  readonly name: string;
  readonly mimeType: string;
  readonly bytes: number;
  readonly contentHash: string;      // sha256 of plaintext
  readonly encryption: 'aes-256-gcm';
  readonly createdAt: string;
}

export interface StorageAdapter {
  readonly name: StorageProvider;
  isAvailable(): Promise<boolean>;
  upload(input: UploadInput): Promise<StoredFile>;
  download(fileId: string, ctx: RequestContext): Promise<Uint8Array>;
  signedUrl(fileId: string, ttlSeconds: number, ctx: RequestContext): Promise<string>;
  remove(fileId: string, ctx: RequestContext): Promise<void>;
  restore(fileId: string, ctx: RequestContext): Promise<void>;
}
```

Precedence is fixed by decision C5: `google-drive` then `supabase-storage`, resolved per
tenant at runtime, recorded as `provider` on every row, with automatic fallback when
`isAvailable()` is false and a migration tool for provider switch. Every file is
AES-256-GCM encrypted before upload, with the key derived from tenant ID and the master
key and never stored in plaintext.

---

## 8. Email

```ts
// lib/contracts/email.ts
export type EmailProvider =
  | 'resend' | 'sendgrid' | 'ses' | 'mailgun' | 'postmark' | 'smtp';

export interface EmailAdapter {
  readonly name: EmailProvider;
  isConfigured(scope: EmailScope): Promise<boolean>;
  send(message: RenderedEmail): Promise<EmailResult>;
  verifyWebhook(payload: unknown, signature: string): Promise<boolean>;
}

export interface EmailQueue {
  enqueue(message: QueuedEmail): Promise<string>;
  claimBatch(limit: number): Promise<readonly QueuedEmail[]>;  // FOR UPDATE SKIP LOCKED
  markSent(id: string, provider: EmailProvider, externalId: string): Promise<void>;
  markFailed(id: string, reason: string, retryable: boolean): Promise<void>;
}
```

Sending always goes through the queue. No route handler sends email inline.

---

## 9. Payment gateway

```ts
// lib/contracts/payment.ts
export type GatewayName =
  | 'stripe' | 'paypal' | 'paddle' | 'nmi' | 'rapyd' | 'adyen' | 'custom';

export interface GatewayAdapter {
  readonly name: GatewayName;
  createCheckout(input: CheckoutInput): Promise<CheckoutSession>;
  capture(authorizationId: string, amount: Money): Promise<CaptureResult>;
  refund(paymentId: string, amount: Money, reason: string): Promise<RefundResult>;
  createPayout(input: PayoutInput): Promise<PayoutResult>;
  verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookEvent | null>;
}
```

Every payment carries an idempotency key that is unique per tenant. Webhook handlers
verify the signature before touching the database and record the event in
`webhook_processed_events` for deduplication.

Local collection and payout methods are named only **"Global Payout Partners"** and
**"Local Payment Methods via Licensed Partners"**. No brand name appears in code, data,
UI or copy. `scripts/check-forbidden-brands.sh` enforces this.

---

## 10. Structured logging

```ts
// lib/contracts/logger.ts
export interface Logger {
  debug(msg: string, fields?: LogFields): void;
  info(msg: string, fields?: LogFields): void;
  warn(msg: string, fields?: LogFields): void;
  error(msg: string, fields?: LogFields): void;
  child(bindings: LogFields): Logger;
}
export type LogFields = Readonly<Record<string, string | number | boolean | null>>;
```

JSON output, one line per event, always carrying `correlation_id`, `actor_id`,
`company_id`, `route` and `duration_ms`. PII keys are scrubbed before write. `console.log`
is banned by ESLint; only `lib/logger/` writes to a transport.

---

## 11. Validation

Every API input has a Zod schema in `lib/validation/schemas/<domain>.ts`, exported and
imported by both the route handler and the client form. `.strict()` on every object
schema, so unknown keys are rejected. No route reads a body without a schema.

Sanitization runs after validation: strings are trimmed, control characters stripped,
HTML removed unless the field is explicitly rich text, and rich text goes through
DOMPurify with an attribute allowlist. Output rendering never uses `innerHTML` or
`dangerouslySetInnerHTML` without sanitization.

---

## 12. Integrator request file

A step never edits a shared file. It writes `integrator/requests/step-NN.json`:

```json
{
  "step": "07",
  "dependencies": {
    "dependencies": { "stripe": "16.12.0" },
    "devDependencies": {}
  },
  "env": [
    { "key": "STRIPE_SECRET_KEY", "scope": "server", "required": true },
    { "key": "STRIPE_WEBHOOK_SECRET", "scope": "server", "required": true }
  ],
  "enums": [
    { "type": "payment_status_enum", "values": ["pending", "authorized", "captured", "failed", "refunded"] }
  ],
  "nav": "config/nav/07-payments.nav.ts",
  "permissions": "config/permissions/07-payments.ts",
  "cron": [],
  "csp": { "connectSrc": ["https://api.stripe.com", "https://js.stripe.com"] },
  "notes": "Webhook routes need the raw body; see netlify.toml request in STEP_14."
}
```

`scope` is `server` or `public`. Only `public` keys are exposed to the browser, and they
must be prefixed `NEXT_PUBLIC_`. The integrator merges requests in step order and reports
conflicts rather than silently overwriting.

---

## 13. Navigation module

```ts
// config/nav/07-payments.nav.ts
import type { NavModule } from '@/lib/contracts/nav';

export const paymentsNav: NavModule = {
  id: 'payments',
  section: 'dashboard',
  items: [
    { href: '/payments', label: 'Payments', icon: 'credit-card',
      permission: 'payments.read', roles: ['owner', 'staff'] },
  ],
};
```

`config/nav-map.ts` imports every module with a glob and builds breadcrumbs, the sidebar,
the command palette and the dead-link audit from that single structure. A step adds a
module; it never edits the aggregator.

---

## 14. Cron module

```ts
// config/cron/14-recurring-invoices.cron.ts
import type { CronJob } from '@/lib/contracts/cron';

export const recurringInvoices: CronJob = {
  id: 'recurring_invoices',
  schedule: '0 2 * * *',
  handler: 'app/api/cron/recurring-invoices',
  leaderLock: true,
  timeoutSeconds: 600,
  idempotencyWindowHours: 24,
};
```

`leaderLock` takes `pg_advisory_lock` so overlapping runs cannot execute twice.

---

## 15. What a step must not do

- Define its own money type, logger, error class, HTTP wrapper or validation helper.
- Create a table without the base shape, RLS, deny policy and audit trigger.
- Call an external service directly instead of through its adapter.
- Read `request.json()` in a route handler instead of using `defineRoute`.
- Send email inline instead of through the queue.
- Import from another Wave 2 step's directories.
- Edit a shared file, another step's migration, or `FEATURE_LIST.md`.
- Use a migration prefix outside its allocated range.
- Create `.test.ts`, `.spec.ts`, `tests/` or `__tests__/`.
