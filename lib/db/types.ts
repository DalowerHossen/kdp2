// path: lib/db/types.ts
// path: lib/db/types.ts
export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export type JsonValue = string | number | boolean | null | JsonObject | readonly JsonValue[];

export interface PageCursor {
  readonly createdAt: string;
  readonly id: string;
}

export interface BaseRow {
  readonly id: string;
  readonly company_id: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly deleted_at: string | null;
  readonly version: number;
}

export const DATABASE_TABLE_NAMES = [
  'companies',
  'users',
  'memberships',
  'roles',
  'admin_sub_roles',
  'permissions',
  'role_permissions',
  'audit_logs',
  'audit_log_hash_chain',
  'ip_reputation',
  'device_fingerprints',
  'sessions',
  'login_attempts',
  'rate_limit_buckets',
  'idempotency_keys',
  'webhook_processed_events',
  'plans',
  'plan_limits',
  'subscriptions',
  'entitlements',
  'coupons',
] as const;

export type DatabaseTableName = (typeof DATABASE_TABLE_NAMES)[number];

type BaseTableDefinition = {
  readonly Row: BaseRow;
  readonly Insert: Partial<
    Omit<BaseRow, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'version'>
  >;
  readonly Update: Partial<Omit<BaseRow, 'id' | 'created_at' | 'company_id'>>;
  readonly Relationships: [];
};

type DatabaseTables = {
  readonly [TableName in DatabaseTableName]: BaseTableDefinition;
};

export interface Database {
  readonly public: {
    readonly Tables: DatabaseTables;
    readonly Views: Record<string, never>;
    readonly Functions: Record<string, never>;
    readonly Enums: Record<string, never>;
    readonly CompositeTypes: Record<string, never>;
  };
}
