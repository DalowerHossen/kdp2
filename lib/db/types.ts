// path: lib/db/types.ts
/**
 * Database access contract for server code. All access is parameterized; the
 * `sql` tagged template makes interpolation into text impossible by
 * construction.
 */

export interface QueryResult<Row> {
  readonly rows: readonly Row[];
  readonly rowCount: number;
}

export interface DbClient {
  query<Row>(text: string, params?: readonly unknown[]): Promise<QueryResult<Row>>;
  withTransaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T>;
  end(): Promise<void>;
}

export interface SqlFragment {
  readonly text: string;
  readonly values: readonly unknown[];
}

export interface CursorPage {
  readonly cursor: string | null; // opaque
  readonly limit: number;
}

export interface CursorPageResult<Row> {
  readonly rows: readonly Row[];
  readonly nextCursor: string | null;
}
