/**
 * schema.ts
 * ---------
 * The user-facing schema DSL: `number()`, `string()`, `boolean()` build
 * column definitions, and `defineModel()` ties a name + column shape
 * together into a `ModelDefinition`. This is the only file a consumer needs
 * to read to understand how to describe a table.
 */
import type { ColumnDefinition, ModelDefinition, ModelShape } from "./types.js";

function column<T>(kind: ColumnDefinition<T>["kind"]): ColumnDefinition<T, false> {
  return {
    kind,
    nullable: false,
    // Phantom value — never read at runtime, only used by TS for inference.
    __type: undefined as unknown as T,
  };
}

/** Declares a column backed by a PostgreSQL numeric type (integer/real). */
export function number(): ColumnDefinition<number, false> {
  return column<number>("number");
}

/** Declares a column backed by a PostgreSQL text/varchar type. */
export function string(): ColumnDefinition<string, false> {
  return column<string>("string");
}

/** Declares a column backed by a PostgreSQL boolean type. */
export function boolean(): ColumnDefinition<boolean, false> {
  return column<boolean>("boolean");
}

/**
 * Declares a model (maps 1:1 to a table). `name` is used both as the SQL
 * table name and as the key you'll access it under on the `db` object
 * returned by `createDatabase`.
 *
 * @example
 * const Todo = defineModel("todo", {
 *   id: number(),
 *   title: string(),
 *   completed: boolean(),
 * });
 */
export function defineModel<Name extends string, Shape extends ModelShape>(
  name: Name,
  columns: Shape,
): ModelDefinition<Name, Shape> {
  return { name, columns };
}
