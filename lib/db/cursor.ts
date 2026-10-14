// path: lib/db/cursor.ts
import type { CursorPage, CursorPageResult } from './types';
import { PAGINATION } from '@/config/constants';

/**
 * Keyset (cursor) pagination over (created_at, id). Offset pagination is not
 * used anywhere in the platform because it degrades and skips rows under
 * concurrent writes.
 */

export interface KeyCursor {
  readonly createdAt: string;
  readonly id: string;
}

export function encodeCursor(cursor: KeyCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeCursor(raw: string): KeyCursor | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as { createdAt?: unknown }).createdAt === 'string' &&
      typeof (parsed as { id?: unknown }).id === 'string'
    ) {
      return parsed as KeyCursor;
    }
    return null;
  } catch {
    return null;
  }
}

export function clampLimit(limit: number | null | undefined): number {
  const candidate = limit ?? PAGINATION.defaultPageSize;
  if (!Number.isInteger(candidate) || candidate <= 0) return PAGINATION.defaultPageSize;
  return Math.min(candidate, PAGINATION.maxPageSize);
}

export function normalizePage(input: { cursor?: string | null; limit?: number | null }): CursorPage {
  const cursor = input.cursor != null ? decodeCursor(input.cursor) : null;
  return {
    cursor: cursor !== null ? encodeCursor(cursor) : null,
    limit: clampLimit(input.limit),
  };
}

export function toPageResult<Row extends { created_at: string; id: string }>(
  rows: readonly Row[],
  limit: number,
): CursorPageResult<Row> {
  const pageRows = rows.slice(0, limit);
  const last = pageRows[pageRows.length - 1];
  const hasMore = rows.length > limit;
  return {
    rows: pageRows,
    nextCursor: hasMore && last !== undefined ? encodeCursor({ createdAt: last.created_at, id: last.id }) : null,
  };
}

/** WHERE fragment for keyset pagination (newest first). */
export function keysetWhere(createdColumn: string, idColumn: string, cursor: KeyCursor | null): {
  text: string;
  values: readonly unknown[];
} {
  if (cursor === null) return { text: '', values: [] };
  return {
    text: ` and (${createdColumn}, ${idColumn}) < ($1::timestamptz, $2::uuid)`,
    values: [cursor.createdAt, cursor.id],
  };
}
