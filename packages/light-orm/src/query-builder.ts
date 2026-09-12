/**
 * query-builder.ts
 * ----------------
 * Pure functions that turn a table name + plain JS objects (`where`,
 * `data`) into a parameterized SQL statement (`{ text, values }`).
 *
 * Nothing here talks to the database — that's `repository.ts`'s job.
 * Keeping SQL generation pure makes it trivial to unit test (see
 * tests/query-builder.test.ts) without a real Postgres connection.
 *
 * Security: every value from user input is passed as a `$n` placeholder in
 * `values`; it is NEVER string-concatenated into `text`. Identifiers (table
 * and column names) come only from the schema the developer defined in
 * code — never from request input — and are double-quoted defensively.
 */

export interface SQLQuery {
  readonly text: string;
  readonly values: readonly unknown[];
}

/** Double-quotes a SQL identifier (table/column name) and escapes embedded quotes. */
export function quoteIdent(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * Builds a `WHERE col1 = $1 AND col2 = $2 ...` fragment (ANDed equality
 * conditions only, per the assignment's filtering requirement).
 *
 * @param where plain object of column -> value
 * @param startIndex the first `$n` placeholder index to use (1-based)
 * @returns the fragment (empty string if `where` has no keys) and the
 *          values in the same order as the placeholders, plus the next
 *          free placeholder index for the caller to continue from.
 */
export function buildWhereClause(
  where: Record<string, unknown> | undefined,
  startIndex = 1,
): { clause: string; values: unknown[]; nextIndex: number } {
  const entries = where ? Object.entries(where).filter(([, v]) => v !== undefined) : [];
  if (entries.length === 0) {
    return { clause: "", values: [], nextIndex: startIndex };
  }
  const parts: string[] = [];
  const values: unknown[] = [];
  let index = startIndex;
  for (const [column, value] of entries) {
    parts.push(`${quoteIdent(column)} = $${index}`);
    values.push(value);
    index += 1;
  }
  return { clause: ` WHERE ${parts.join(" AND ")}`, values, nextIndex: index };
}

/** `SELECT "a", "b" FROM "table" [WHERE ...]` */
export function buildSelect(
  table: string,
  columns: readonly string[],
  where?: Record<string, unknown>,
): SQLQuery {
  const columnList = columns.map(quoteIdent).join(", ");
  const { clause, values } = buildWhereClause(where);
  return {
    text: `SELECT ${columnList} FROM ${quoteIdent(table)}${clause}`,
    values,
  };
}

/** `INSERT INTO "table" ("a","b") VALUES ($1,$2) RETURNING "a","b",...` */
export function buildInsert(
  table: string,
  columns: readonly string[],
  data: Record<string, unknown>,
): SQLQuery {
  const keys = Object.keys(data);
  const columnList = keys.map(quoteIdent).join(", ");
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
  const values = keys.map((k) => data[k]);
  const returning = columns.map(quoteIdent).join(", ");
  return {
    text: `INSERT INTO ${quoteIdent(table)} (${columnList}) VALUES (${placeholders}) RETURNING ${returning}`,
    values,
  };
}

/** `UPDATE "table" SET "a" = $1 WHERE "b" = $2 RETURNING ...` */
export function buildUpdate(
  table: string,
  columns: readonly string[],
  data: Record<string, unknown>,
  where: Record<string, unknown>,
): SQLQuery {
  const keys = Object.keys(data);
  if (keys.length === 0) {
    throw new Error("light-orm: update() requires at least one field in `data`");
  }
  const setParts = keys.map((k, i) => `${quoteIdent(k)} = $${i + 1}`);
  const values: unknown[] = keys.map((k) => data[k]);
  const { clause, values: whereValues } = buildWhereClause(where, keys.length + 1);
  values.push(...whereValues);
  const returning = columns.map(quoteIdent).join(", ");
  return {
    text: `UPDATE ${quoteIdent(table)} SET ${setParts.join(", ")}${clause} RETURNING ${returning}`,
    values,
  };
}

/** `DELETE FROM "table" WHERE ... RETURNING ...` */
export function buildDelete(
  table: string,
  columns: readonly string[],
  where: Record<string, unknown>,
): SQLQuery {
  const { clause, values } = buildWhereClause(where);
  if (!clause) {
    // Refuse to build an unconditional DELETE — this is a safety guard, not
    // a SQL-injection concern, but it prevents an easy-to-make mistake
    // (`delete({ where: {} })` wiping the whole table).
    throw new Error("light-orm: delete() requires a non-empty `where` clause");
  }
  const returning = columns.map(quoteIdent).join(", ");
  return {
    text: `DELETE FROM ${quoteIdent(table)}${clause} RETURNING ${returning}`,
    values,
  };
}
