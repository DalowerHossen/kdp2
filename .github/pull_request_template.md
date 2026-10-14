<!-- Path ownership rules: every step PR targets `integration`, never `main`. -->
## Step

- Step: STEP_<NN> - <name>
- Base: `integration` (never `main`)
- Feature line range covered: FEATURE_LIST.md lines ___-___

## Gate output

Paste the full output of the exit gate (typecheck, lint, build, verify, verify-db,
verify-rls, boundary check). A red gate blocks review.

```text

```

## Request file

- [ ] `integrator/requests/step-<NN>.json` is included if any shared file needs a change
- [ ] No file outside my step's ownership was touched (boundary check pasted above)
- [ ] `docs/feature-coverage.md` updated for my features

## Documentation read log

For any payment-processor work (ADDENDUM_PAYMENTS_AUTH.md P-01): list every official
documentation URL read, with the read date. `blocked` adapters must name the reason.

| Processor | Doc URL read | Date | Status |
| --- | --- | --- | --- |
