/**
 * types.ts
 * --------
 * All the compile-time machinery that gives the ORM its type safety lives
 * here. Nothing in this file has a runtime effect on its own — the `__type`
 * properties on columns are "phantom" fields: they exist only so TypeScript
 * can infer a JS type from a column definition, and are stripped away by the
 * compiler (they hold the value `undefined as unknown as T`, never read).
 */

/** The three primitive column kinds this ORM supports. */
export type ColumnKind = "number" | "string" | "boolean";

/**
 * A single column's definition. `T` is the TypeScript type this column
 * represents at runtime (number, string, or boolean). `nullable` and
 * `hasDefault` are plain runtime flags used by the SQL generator and by the
 * type-level Create/Update helpers below.
 */
export interface ColumnDefinition<T, Nullable extends boolean = false> {
  readonly kind: ColumnKind;
  readonly nullable: Nullable;
  /** Phantom field: carries the TS type only, never assigned a real value. */
  readonly __type: Nullable extends true ? T | null : T;
}

/** A model's shape is just a map of column name -> column definition. */
export type ModelShape = Record<string, ColumnDefinition<unknown, boolean>>;

/** A model definition as returned by `defineModel`. */
export interface ModelDefinition<Name extends string, Shape extends ModelShape> {
  readonly name: Name;
  readonly columns: Shape;
}

/** Extract the plain "row" TypeScript type from a column shape. */
export type InferShape<Shape extends ModelShape> = {
  [K in keyof Shape]: Shape[K]["__type"];
};

/**
 * Public helper: `type Todo = InferModel<typeof Todo>` gives you the plain
 * object type for a model's rows, e.g. `{ id: number; title: string; completed: boolean }`.
 */
export type InferModel<M> = M extends ModelDefinition<string, infer Shape>
  ? InferShape<Shape>
  : never;

/**
 * By convention, a column named "id" is treated as the auto-generated
 * PostgreSQL primary key (SERIAL / GENERATED ALWAYS AS IDENTITY). It is:
 *   - never required on create (the database assigns it)
 *   - never editable on update
 * This mirrors how the assignment's example schema is used (`id: number()`
 * is declared, but never passed into `.create()`).
 */
export type PrimaryKeyName = "id";

/** Fields required/allowed when creating a row: every column except "id". */
export type CreateInput<M> = M extends ModelDefinition<string, infer Shape>
  ? Omit<InferShape<Shape>, PrimaryKeyName>
  : never;

/** Fields allowed when updating a row: every column except "id", all optional. */
export type UpdateInput<M> = M extends ModelDefinition<string, infer Shape>
  ? Partial<Omit<InferShape<Shape>, PrimaryKeyName>>
  : never;

/**
 * Equality-filter object used by `where`. Every key is optional; when more
 * than one key is present they are combined with SQL `AND`.
 */
export type WhereInput<M> = M extends ModelDefinition<string, infer Shape>
  ? Partial<InferShape<Shape>>
  : never;

/** Options accepted by findMany / findFirst. */
export interface FindOptions<M> {
  where?: WhereInput<M>;
}

/** Options accepted by update. */
export interface UpdateOptions<M> {
  where: WhereInput<M>;
  data: UpdateInput<M>;
}

/** Options accepted by delete. */
export interface DeleteOptions<M> {
  where: WhereInput<M>;
}

/** A generated, parameterized SQL statement — text with `$1, $2, ...` placeholders and its values. */
export interface SQLQuery {
  readonly text: string;
  readonly values: readonly unknown[];
}

/** Minimal shape of the subset of `pg` that the ORM depends on (keeps the driver swappable/mockable). */
export interface QueryExecutor {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Row[] }>;
}
