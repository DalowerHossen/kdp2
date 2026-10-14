<!-- path: .github/pull_request_template.md -->
## Summary

Describe the change and its user-visible or operational effect.

## Scope and ownership

- [ ] Changed files belong to this step.
- [ ] No other step's feature or implementation has been duplicated.
- [ ] Shared contracts are consumed without local redefinition.

## Security and data integrity

- [ ] Request handlers use `defineRoute` and validate input with strict schemas.
- [ ] Mutations use `defineMutation` with audit, idempotency, and version checks.
- [ ] New tables have forced RLS, a default-deny policy, and audit triggers.
- [ ] External calls use an adapter with timeouts and an offline fixture.
- [ ] No secrets or customer data are included in source or logs.

## Verification

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm run verify`
- [ ] `npm run verify-db` when migrations change
- [ ] Run `npm run check-boundaries -- --step` with this pull request's assigned two-digit step number.

## Migration and integration notes

List migrations, environment requirements, and manual integrator wiring. Write `None` when there are no additional requirements.
