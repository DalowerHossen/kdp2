// path: lib/db/index.ts
export type { DbClient, QueryResult, SqlFragment, CursorPage, CursorPageResult } from './types';
export { sql, query } from './sql';
export { getDb, getPool, shutdownDb } from './client';
export {
  encodeCursor,
  decodeCursor,
  clampLimit,
  normalizePage,
  toPageResult,
  keysetWhere,
} from './cursor';
export type { KeyCursor } from './cursor';
