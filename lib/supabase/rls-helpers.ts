// path: lib/supabase/rls-helpers.ts
import type { DbClient } from '@/lib/db/types';

/**
 * Tenant context for direct-SQL work. RLS policies read
 * current_setting('app.company_id', true); these helpers set it inside a
 * transaction so the database, not the application, enforces isolation.
 */

export async function withTenantContext<T>(
  db: DbClient,
  companyId: string,
  fn: (tx: DbClient) => Promise<T>,
): Promise<T> {
  return db.withTransaction(async (tx) => {
    await tx.query('select set_config($1, $2, true)', ['app.company_id', companyId]);
    return fn(tx);
  });
}

/**
 * Platform-scope context for legitimate cross-tenant administration. Setting
 * an empty company id makes tenant-scoped policies fail closed; only policies
 * written for platform roles pass. Use sparingly and always audited.
 */
export async function withPlatformContext<T>(
  db: DbClient,
  fn: (tx: DbClient) => Promise<T>,
): Promise<T> {
  return db.withTransaction(async (tx) => {
    await tx.query('select set_config($1, $2, true)', ['app.company_id', '']);
    await tx.query('select set_config($1, $2, true)', ['app.platform_admin', 'true']);
    return fn(tx);
  });
}
