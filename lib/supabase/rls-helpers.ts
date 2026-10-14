// path: lib/supabase/rls-helpers.ts
import type { RequestContext } from '@/lib/contracts/http';
import type { BaseRow } from '@/lib/db/types';
import { NotFoundError } from '@/lib/errors/domain-errors';
import { companyIdSchema } from '@/lib/validation/primitives';

export function requireTenantId(context: RequestContext): string {
  const companyId = context.tenantId;
  if (
    companyId === null ||
    context.actor.companyId !== companyId ||
    !companyIdSchema.safeParse(companyId).success
  ) {
    throw new NotFoundError('The requested resource was not found.', {
      correlationId: context.correlationId,
    });
  }
  return companyId;
}

export function assertTenantRow(row: Pick<BaseRow, 'company_id'>, context: RequestContext): void {
  const tenantId = requireTenantId(context);
  if (row.company_id !== tenantId) {
    throw new NotFoundError('The requested resource was not found.', {
      correlationId: context.correlationId,
    });
  }
}

export function assertTenantId(companyId: string, context: RequestContext): void {
  const tenantId = requireTenantId(context);
  if (companyId !== tenantId) {
    throw new NotFoundError('The requested resource was not found.', {
      correlationId: context.correlationId,
    });
  }
}
