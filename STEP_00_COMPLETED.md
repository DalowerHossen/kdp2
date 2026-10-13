<!-- path: STEP_00_COMPLETED.md -->

# STEP_00 - Foundation and Governance Handoff

## Outcome

STEP_00 remains a zero-feature foundation step. No `FEATURE_LIST.md` feature is marked implemented; all 4,187 manifest records have `implemented: false`. The migration range remains `0000`-`0099`. Work is on `arena/b9ca9a1c-kdp2`, based on `0a71ce351a9f54b2b41da721564a34f775249e7e`. No commit, push, pull request, or merge was made.

The read-only source documents `FEATURE_LIST.md`, `docs/execution/STEP_FEATURES.md`, and `SPEC_CONFLICTS.md` were not modified. `FEATURE_LIST.md` SHA-256 remains `c6c054be720fbbb112feda32367cfb5790acfd805b5a5fdaa12befac05652103`.

## Delivered files and changes

### B7.1 manifest

- `scripts/build-feature-manifest.mjs` parses and validates source locations, unique assignments, steps, parts, regions, canonical IDs, and slugs. It prints the Region C C2 renumbering map and writes the JSON manifest.
- `scripts/feature-glossary.json` is the checked-in, deterministic Bengali-to-English glossary used by the builder. It contains 1,180 entries; no translation service or package was added.
- `docs/feature-manifest.json` contains 4,187 canonical records, sorted by canonical ID, grouped compactly on 468 lines to stay below the repository's 500-line file limit. Each record has `id`, `printedId`, `region`, `line`, `slug`, ASCII `text`, `step`, `part`, `section`, `workPackages`, and `implemented`.
- `.prettierignore` excludes the compact generated manifest and glossary from automatic reformatting.

The builder reported zero section-only summary fallbacks. It omitted 541 distinct Bengali source terms that were not present in the glossary; the manifest still contains an ASCII English summary and the exact source line for every feature. This is a summary, not a full translation of every Bengali phrase. All 11 hard-coded work-package arrays were compared against the traceability matrix in `IMPLEMENTATION_PLAN.md` (lines 428-444); every array exactly matches its corresponding row.

### Final-gate correction

The first `npm run verify` attempt found a false positive in the monetary-name guard: two non-monetary byte accumulators were named `totalBytes`. They are now named `bodyByteLength` in `lib/http/idempotency.ts` and `lib/http/request-body.ts`. The guard was not weakened and passes across all 43 scanned source files.

### Earlier foundation batches

`PLAN_STEP_00.md` contains the batch-by-batch inventory for B1.1 through B6.1, including the shared contracts, migrations, shells, CI, and guard scripts. The only additional B7.1 paths are listed above, plus this handoff and the plan update.

## Migration inventory

Six up migrations have matching down migrations; no migration was added or changed during B7.1.

| Up migration                        | Down migration                           |
| ----------------------------------- | ---------------------------------------- |
| `migrations/0000_extensions.sql`    | `migrations/0000_extensions_down.sql`    |
| `migrations/0001_platform_core.sql` | `migrations/0001_platform_core_down.sql` |
| `migrations/0002_enums.sql`         | `migrations/0002_enums_down.sql`         |
| `migrations/0003_audit.sql`         | `migrations/0003_audit_down.sql`         |
| `migrations/0004_security.sql`      | `migrations/0004_security_down.sql`      |
| `migrations/0005_plans.sql`         | `migrations/0005_plans_down.sql`         |

PGlite verification applied all six up migrations, validated all 21 application tables, rolled back all six down migrations, and confirmed a full rollback. Live PostgreSQL execution was not run because `psql` is not installed in this environment.

## Dependency and environment requests

B7.1 adds no npm dependency. Dependencies were installed from the existing lockfile earlier in STEP_00. The application environment keys documented in `.env.example` are:

- `APP_URL`, `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`, `ENCRYPTION_MASTER_KEY`
- `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`

Provide live values through a deployment secret manager; do not commit credentials. Running migrations against PostgreSQL additionally requires `DATABASE_URL` and the `psql` client.

## Integration wiring and known boundaries

- `middleware.ts` validates request authority, refreshes Supabase sessions when configured, and attaches CSP, correlation, security headers, and a CSRF cookie. It does not provide IP-reputation scoring.
- `lib/http/define-route.ts` uses the shared `RouteRuntime` contract; concrete authentication, network-guard, audit, durable rate-limit, and idempotency providers remain integrator wiring. Idempotent routes fail closed if the durable store is absent.
- `app/layout.tsx` and the dashboard, admin, client-portal, and public layouts provide the shared shells. Theme startup is persisted/system-mode bootstrap with CSS tokens, not a full interactive theme UI; typography uses the system stack.
- Navigation integrity reports zero page routes, registrations, and link targets, as expected before feature pages are implemented.
- The production build currently emits `/404` and Middleware only. The build succeeds; Next also prints an advisory that its ESLint plugin is not detected.

## Exit-gate results

All required STEP_00 checks exited 0:

| Command                                                                                                | Result                                                                               |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `node scripts/build-feature-manifest.mjs`                                                              | PASS - 4,187 records, 468 lines, 158 Region C mappings, zero section-only fallbacks. |
| `npm run typecheck`                                                                                    | PASS - `tsc --noEmit`.                                                               |
| `npm run lint`                                                                                         | PASS - ESLint with zero warnings.                                                    |
| `npm run build`                                                                                        | PASS - production build completed.                                                   |
| `npm run verify`                                                                                       | PASS - every wired guard ran and passed.                                             |
| `npm run verify-db`                                                                                    | PASS - six migration pairs, 21 tables, full rollback.                                |
| `npm run verify-rls`                                                                                   | PASS - default-deny across 21 tables and two-tenant isolation.                       |
| `npm run check-boundaries -- --step 00`                                                                | PASS - 114 paths checked against the assigned base commit.                           |
| `npm exec prettier -- --check scripts/build-feature-manifest.mjs PLAN_STEP_00.md STEP_00_COMPLETED.md` | PASS - the touched builder, plan, and handoff are formatted.                         |

`npm run verify` reported these checks: typecheck, lint, English-only source, money types, path comments, forbidden tokens, no-test-files, forbidden brands, migration lint, navigation integrity, boundaries, feature coverage, database verification, and RLS verification. Feature coverage passed with 4,187 records across 15 steps and zero marked implemented. The step counts were 450, 40, 133, 109, 145, 499, 390, 325, 323, 499, 264, 273, 158, 158, and 421.

### Database verification output

```text
PASS migration up 0000_extensions.sql.
PASS migration up 0001_platform_core.sql.
PASS migration up 0002_enums.sql.
PASS migration up 0003_audit.sql.
PASS migration up 0004_security.sql.
PASS migration up 0005_plans.sql.
PASS table admin_sub_roles: base columns, RLS, default-deny, audit trigger, indexes, and 0 money column(s).
PASS table audit_log_hash_chain: base columns, RLS, default-deny, audit trigger, indexes, and 0 money column(s).
PASS table audit_logs: base columns, RLS, default-deny, audit trigger, indexes, and 0 money column(s).
PASS table companies: base columns, RLS, default-deny, audit trigger, indexes, and 0 money column(s).
PASS table coupons: base columns, RLS, default-deny, audit trigger, indexes, and 1 money column(s).
PASS table device_fingerprints: base columns, RLS, default-deny, audit trigger, indexes, and 0 money column(s).
PASS table entitlements: base columns, RLS, default-deny, audit trigger, indexes, and 0 money column(s).
PASS table idempotency_keys: base columns, RLS, default-deny, audit trigger, indexes, and 0 money column(s).
PASS table ip_reputation: base columns, RLS, default-deny, audit trigger, indexes, and 0 money column(s).
PASS table login_attempts: base columns, RLS, default-deny, audit trigger, indexes, and 0 money column(s).
PASS table memberships: base columns, RLS, default-deny, audit trigger, indexes, and 0 money column(s).
PASS table permissions: base columns, RLS, default-deny, audit trigger, indexes, and 0 money column(s).
PASS table plan_limits: base columns, RLS, default-deny, audit trigger, indexes, and 0 money column(s).
PASS table plans: base columns, RLS, default-deny, audit trigger, indexes, and 2 money column(s).
PASS table rate_limit_buckets: base columns, RLS, default-deny, audit trigger, indexes, and 0 money column(s).
PASS table role_permissions: base columns, RLS, default-deny, audit trigger, indexes, and 0 money column(s).
PASS table roles: base columns, RLS, default-deny, audit trigger, indexes, and 0 money column(s).
PASS table sessions: base columns, RLS, default-deny, audit trigger, indexes, and 0 money column(s).
PASS table subscriptions: base columns, RLS, default-deny, audit trigger, indexes, and 0 money column(s).
PASS table users: base columns, RLS, default-deny, audit trigger, indexes, and 0 money column(s).
PASS table webhook_processed_events: base columns, RLS, default-deny, audit trigger, indexes, and 0 money column(s).
PASS migration down 0005_plans_down.sql.
PASS migration down 0004_security_down.sql.
PASS migration down 0003_audit_down.sql.
PASS migration down 0002_enums_down.sql.
PASS migration down 0001_platform_core_down.sql.
PASS migration down 0000_extensions_down.sql.
Database verification passed: 6 migration pair(s), 21 table(s), and full rollback.
```

### RLS verification output

```text
PASS default-deny: restricted role sees zero rows across 21 tables and cannot insert.
PASS tenant isolation: each tenant reads its own row and cross-tenant reads return zero rows under an isolated verification policy.
RLS verification passed: default-deny across 21 tables and isolated reads for two tenants.
```

### Optional repository-wide formatting check

The full `npm run format:check` exited 1 because 29 repository files are not Prettier-formatted, including read-only specification documents and existing repository files. Those unrelated files were not rewritten. The touched builder, plan, and handoff passed the targeted Prettier check above.

## Region C renumbering map

```text
C-3451 -> 4030
C-3452 -> 4031
C-3453 -> 4032
C-3454 -> 4033
C-3455 -> 4034
C-3456 -> 4035
C-3457 -> 4036
C-3458 -> 4037
C-3459 -> 4038
C-3460 -> 4039
C-3461 -> 4040
C-3462 -> 4041
C-3463 -> 4042
C-3464 -> 4043
C-3465 -> 4044
C-3466 -> 4045
C-3467 -> 4046
C-3468 -> 4047
C-3469 -> 4048
C-3470 -> 4049
C-3471 -> 4050
C-3472 -> 4051
C-3473 -> 4052
C-3474 -> 4053
C-3475 -> 4054
C-3476 -> 4055
C-3477 -> 4056
C-3478 -> 4057
C-3479 -> 4058
C-3480 -> 4059
C-3481 -> 4060
C-3482 -> 4061
C-3483 -> 4062
C-3484 -> 4063
C-3485 -> 4064
C-3486 -> 4065
C-3487 -> 4066
C-3488 -> 4067
C-3489 -> 4068
C-3490 -> 4069
C-3491 -> 4070
C-3492 -> 4071
C-3493 -> 4072
C-3494 -> 4073
C-3495 -> 4074
C-3496 -> 4075
C-3497 -> 4076
C-3498 -> 4077
C-3499 -> 4078
C-3500 -> 4079
C-3501 -> 4080
C-3502 -> 4081
C-3503 -> 4082
C-3504 -> 4083
C-3505 -> 4084
C-3506 -> 4085
C-3507 -> 4086
C-3508 -> 4087
C-3509 -> 4088
C-3510 -> 4089
C-3511 -> 4090
C-3512 -> 4091
C-3513 -> 4092
C-3514 -> 4093
C-3515 -> 4094
C-3516 -> 4095
C-3517 -> 4096
C-3518 -> 4097
C-3519 -> 4098
C-3520 -> 4099
C-3521 -> 4100
C-3522 -> 4101
C-3523 -> 4102
C-3524 -> 4103
C-3525 -> 4104
C-3526 -> 4105
C-3527 -> 4106
C-3528 -> 4107
C-3529 -> 4108
C-3530 -> 4109
C-3531 -> 4110
C-3532 -> 4111
C-3533 -> 4112
C-3534 -> 4113
C-3535 -> 4114
C-3536 -> 4115
C-3537 -> 4116
C-3538 -> 4117
C-3539 -> 4118
C-3540 -> 4119
C-3541 -> 4120
C-3542 -> 4121
C-3543 -> 4122
C-3544 -> 4123
C-3545 -> 4124
C-3546 -> 4125
C-3547 -> 4126
C-3548 -> 4127
C-3549 -> 4128
C-3550 -> 4129
C-3551 -> 4130
C-3552 -> 4131
C-3553 -> 4132
C-3554 -> 4133
C-3555 -> 4134
C-3556 -> 4135
C-3557 -> 4136
C-3558 -> 4137
C-3559 -> 4138
C-3560 -> 4139
C-3561 -> 4140
C-3562 -> 4141
C-3563 -> 4142
C-3564 -> 4143
C-3565 -> 4144
C-3566 -> 4145
C-3567 -> 4146
C-3568 -> 4147
C-3569 -> 4148
C-3570 -> 4149
C-3571 -> 4150
C-3572 -> 4151
C-3573 -> 4152
C-3574 -> 4153
C-3575 -> 4154
C-3576 -> 4155
C-3577 -> 4156
C-3578 -> 4157
C-3579 -> 4158
C-3580 -> 4159
C-3581 -> 4160
C-3582 -> 4161
C-3583 -> 4162
C-3584 -> 4163
C-3585 -> 4164
C-3586 -> 4165
C-3587 -> 4166
C-3588 -> 4167
C-3589 -> 4168
C-3590 -> 4169
C-3591 -> 4170
C-3592 -> 4171
C-3593 -> 4172
C-3594 -> 4173
C-3595 -> 4174
C-3596 -> 4175
C-3597 -> 4176
C-3598 -> 4177
C-3599 -> 4178
C-3600 -> 4179
C-3601 -> 4180
C-3602 -> 4181
C-3603 -> 4182
C-3604 -> 4183
C-3605 -> 4184
C-3606 -> 4185
C-3607 -> 4186
C-3608 -> 4187
```
