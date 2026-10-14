// path: config/permissions/00-foundation.ts
/**
 * Foundation permission keys (STEP_00). Steps register their own keys in
 * config/permissions/<slug>.ts; the aggregator in ./map.ts validates
 * uniqueness. Keys seeded into the `permissions` table live in
 * migrations/0001_platform_core.sql.
 */

export interface PermissionDefinition {
  readonly key: string;
  readonly description: string;
}

export const FOUNDATION_PERMISSIONS: readonly PermissionDefinition[] = [
  { key: 'platform.root', description: 'Full platform access (super_admin implicit).' },
  { key: 'rbac.read', description: 'Read roles, sub-roles and permission assignments.' },
  { key: 'rbac.manage', description: 'Change role and permission assignments.' },
] as const;
