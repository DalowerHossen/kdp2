// path: lib/validation/registry.ts
import { ZodType, ZodTypeDef } from 'zod';

export type SchemaRegistrationResult =
  | { readonly registered: true }
  | { readonly registered: false; readonly reason: 'invalid_key' | 'duplicate_key' };

const SCHEMA_KEY_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;

export class SchemaRegistry {
  private readonly schemas = new Map<string, ZodType<unknown, ZodTypeDef, unknown>>();

  register<TInput, TOutput>(
    key: string,
    schema: ZodType<TOutput, ZodTypeDef, TInput>,
  ): SchemaRegistrationResult {
    if (!SCHEMA_KEY_PATTERN.test(key)) {
      return { registered: false, reason: 'invalid_key' };
    }
    if (this.schemas.has(key)) {
      return { registered: false, reason: 'duplicate_key' };
    }
    this.schemas.set(key, schema as unknown as ZodType<unknown, ZodTypeDef, unknown>);
    return { registered: true };
  }

  resolve(key: string): ZodType<unknown, ZodTypeDef, unknown> | undefined {
    return this.schemas.get(key);
  }

  keys(): readonly string[] {
    return [...this.schemas.keys()].sort();
  }
}
