// path: lib/db/query.ts
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DATABASE_QUERY_TIMEOUT_MS } from '@/config/constants';
import {
  DATABASE_TABLE_NAMES,
  type BaseRow,
  type Database,
  type DatabaseTableName,
  type PageCursor,
} from '@/lib/db/types';
import { AppError } from '@/lib/contracts/errors';
import { InternalError, ValidationError } from '@/lib/errors/domain-errors';
import { getCurrentCorrelationId } from '@/lib/logger/correlation';
import { logger } from '@/lib/logger/logger';
import {
  companyIdSchema,
  isoUtcDateTimeSchema,
  pageSizeSchema,
  uuidV7Schema,
} from '@/lib/validation/primitives';

interface DatabaseQueryError {
  readonly code?: string;
  readonly message: string;
}

interface DatabaseQueryResponse<TValue> {
  readonly data: TValue | null;
  readonly error: DatabaseQueryError | null;
}

export type DatabaseQueryOperation<TValue> = (
  signal: AbortSignal,
) => PromiseLike<DatabaseQueryResponse<TValue>>;

export interface BasePageOptions {
  readonly companyId: string | null;
  readonly limit: number;
  readonly cursor?: PageCursor;
}

const TABLE_NAME_SCHEMA = z.enum(DATABASE_TABLE_NAMES);
const PAGE_CURSOR_SCHEMA = z
  .object({
    createdAt: isoUtcDateTimeSchema,
    id: uuidV7Schema,
  })
  .strict();
const BASE_COLUMN_SELECT = 'id,company_id,created_at,updated_at,deleted_at,version';

function correlationOptions(correlationId: string | undefined): { correlationId?: string } {
  return correlationId === undefined ? {} : { correlationId };
}

function logQueryFailure(
  operation: string,
  startedAt: number,
  correlationId: string | undefined,
  errorCode: string | null,
): void {
  logger.error('Database query failed.', {
    operation,
    correlation_id: correlationId ?? getCurrentCorrelationId(),
    database_error_code: errorCode,
    duration_ms: Math.max(0, performance.now() - startedAt),
  });
}

export async function executeQuery<TValue>(
  operation: DatabaseQueryOperation<TValue>,
  operationName: string,
  correlationId?: string,
): Promise<TValue | null> {
  const startedAt = performance.now();
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      logQueryFailure(operationName, startedAt, correlationId, 'query_timeout');
      reject(new InternalError(correlationOptions(correlationId)));
    }, DATABASE_QUERY_TIMEOUT_MS);
  });

  try {
    const response = await Promise.race([Promise.resolve(operation(controller.signal)), timeout]);
    if (response.error !== null) {
      logQueryFailure(operationName, startedAt, correlationId, response.error.code ?? null);
      throw new InternalError(correlationOptions(correlationId));
    }
    return response.data;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logQueryFailure(operationName, startedAt, correlationId, null);
    throw new InternalError(correlationOptions(correlationId));
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

function cursorFilter(cursor: PageCursor): string {
  const parsedCursor = PAGE_CURSOR_SCHEMA.safeParse(cursor);
  if (!parsedCursor.success) {
    throw new ValidationError('The database cursor is invalid.');
  }
  const { createdAt, id } = parsedCursor.data;
  return `created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${id})`;
}

export async function selectBasePage(
  client: SupabaseClient<Database>,
  table: DatabaseTableName,
  options: BasePageOptions,
  correlationId?: string,
): Promise<readonly BaseRow[]> {
  try {
    const tableName = TABLE_NAME_SCHEMA.safeParse(table);
    const pageSize = pageSizeSchema.safeParse(options.limit);
    const companyId =
      options.companyId === null ? null : companyIdSchema.safeParse(options.companyId);
    if (!tableName.success || !pageSize.success || (companyId !== null && !companyId.success)) {
      throw new ValidationError(
        'The database page request is invalid.',
        correlationOptions(correlationId),
      );
    }

    let query = client.from(tableName.data).select(BASE_COLUMN_SELECT);
    query =
      companyId === null ? query.is('company_id', null) : query.eq('company_id', companyId.data);
    query = query.is('deleted_at', null);
    query = query.order('created_at', { ascending: false }).order('id', { ascending: false });
    if (options.cursor !== undefined) {
      query = query.or(cursorFilter(options.cursor));
    }
    query = query.limit(pageSize.data);
    const rows = await executeQuery<readonly BaseRow[]>(
      (signal) => query.abortSignal(signal),
      'select_base_page',
      correlationId,
    );
    return rows ?? [];
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new InternalError(correlationOptions(correlationId));
  }
}
