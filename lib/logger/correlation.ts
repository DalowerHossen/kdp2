// path: lib/logger/correlation.ts
import { AsyncLocalStorage } from 'node:async_hooks';
import { createErrorCorrelationId } from '@/lib/errors/app-error';
import { uuidV7Schema, type UuidV7 } from '@/lib/validation/primitives';

const correlationStorage = new AsyncLocalStorage<UuidV7>();

export function createCorrelationId(): UuidV7 {
  return uuidV7Schema.parse(createErrorCorrelationId());
}

export function resolveCorrelationId(value: string | null | undefined): UuidV7 {
  const parsed = uuidV7Schema.safeParse(value);
  return parsed.success ? parsed.data : createCorrelationId();
}

export function withCorrelationId<T>(value: string | null | undefined, action: () => T): T {
  return correlationStorage.run(resolveCorrelationId(value), action);
}

export function getCurrentCorrelationId(): UuidV7 | null {
  return correlationStorage.getStore() ?? null;
}
