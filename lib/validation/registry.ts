// path: lib/validation/registry.ts
import type { ZodType } from 'zod';

/**
 * Schema registry (CONTRACTS.md section 11). One schema per (domain, action),
 * imported by both the route handler and the client form so they can never
 * diverge.
 */

export type SchemaKey = `${string}.${string}`;

const registry = new Map<SchemaKey, ZodType<unknown>>();

export function registerSchema<T>(key: SchemaKey, schema: ZodType<T>): ZodType<T> {
  if (registry.has(key)) {
    throw new Error(`Duplicate schema registration: ${key}`);
  }
  registry.set(key, schema as ZodType<unknown>);
  return schema;
}

export function getSchema<T>(key: SchemaKey): ZodType<T> {
  const schema = registry.get(key);
  if (schema === undefined) {
    throw new Error(`Unknown schema: ${key}`);
  }
  return schema as ZodType<T>;
}

export function listSchemas(): readonly SchemaKey[] {
  return [...registry.keys()].sort();
}
