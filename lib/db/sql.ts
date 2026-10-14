// path: lib/db/sql.ts
import type { DbClient, QueryResult, SqlFragment } from './types';

/**
 * Parameterized-only SQL template. Values are bound as $1..$n parameters;
 * raw text can never contain an interpolated value.
 *
 *   const rows = await query<User>(db, sql`select * from users where id = ${id}`);
 */

export function sql(strings: TemplateStringsArray, ...values: readonly unknown[]): SqlFragment {
  let text = '';
  strings.forEach((chunk, i) => {
    text += chunk;
    if (i < values.length) {
      text += `$${i + 1}`;
    }
  });
  return { text, values };
}

export async function query<Row>(
  db: DbClient,
  fragment: SqlFragment,
): Promise<QueryResult<Row>> {
  return db.query<Row>(fragment.text, fragment.values);
}
