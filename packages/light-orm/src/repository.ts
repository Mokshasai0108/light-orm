/**
 * repository.ts
 * -------------
 * The Repository is what `db.todo` actually is. It is the layer directly
 * below the "Model API" in the architecture diagram:
 *
 *   Model API (db.todo.create(...))
 *     -> Repository            <-- this file
 *       -> Query Builder        (query-builder.ts: builds { text, values })
 *         -> SQL Generator       (same file — building parameterized SQL IS the generation step)
 *           -> PostgreSQL Driver (client.ts: `pg.Pool`)
 *
 * Each method is generic over a `ModelDefinition`, so the *caller*
 * (`client.ts`) determines the concrete row type for a given table, and
 * TypeScript infers everything else — no `any` needed anywhere in the
 * public API.
 */
import { buildDelete, buildInsert, buildSelect, buildUpdate } from "./query-builder.js";
import type {
  CreateInput,
  DeleteOptions,
  FindOptions,
  InferModel,
  ModelDefinition,
  ModelShape,
  QueryExecutor,
  UpdateOptions,
} from "./types.js";

export class Repository<M extends ModelDefinition<string, ModelShape>> {
  private readonly table: string;
  private readonly columnNames: readonly string[];

  constructor(
    private readonly model: M,
    private readonly executor: QueryExecutor,
  ) {
    this.table = model.name;
    this.columnNames = Object.keys(model.columns);
  }

  /** Insert a new row. `id` is never accepted — the database assigns it. */
  async create(data: CreateInput<M>): Promise<InferModel<M>> {
    const query = buildInsert(this.table, this.columnNames, data as Record<string, unknown>);
    const result = await this.executor.query<InferModel<M> & Record<string, unknown>>(
      query.text,
      query.values,
    );
    const row = result.rows[0];
    if (!row) {
      throw new Error(`light-orm: INSERT into "${this.table}" returned no row`);
    }
    return row;
  }

  /** Return every row matching `where` (all conditions ANDed). No `where` returns every row. */
  async findMany(options: FindOptions<M> = {}): Promise<InferModel<M>[]> {
    const query = buildSelect(
      this.table,
      this.columnNames,
      options.where as Record<string, unknown> | undefined,
    );
    const result = await this.executor.query<InferModel<M> & Record<string, unknown>>(
      query.text,
      query.values,
    );
    return result.rows;
  }

  /** Return the first row matching `where`, or `null` if none match. */
  async findFirst(options: FindOptions<M> = {}): Promise<InferModel<M> | null> {
    const rows = await this.findMany(options);
    return rows[0] ?? null;
  }

  /** Update every row matching `where` and return the updated rows. */
  async update(options: UpdateOptions<M>): Promise<InferModel<M>[]> {
    const query = buildUpdate(
      this.table,
      this.columnNames,
      options.data as Record<string, unknown>,
      options.where as Record<string, unknown>,
    );
    const result = await this.executor.query<InferModel<M> & Record<string, unknown>>(
      query.text,
      query.values,
    );
    return result.rows;
  }

  /**
   * Convenience wrapper around `update` for the common "update one row by
   * id" case used by the Todo app's `PATCH /api/todos/:id`.
   */
  async updateById(
    id: InferModel<M> extends { id: infer Id } ? Id : never,
    data: UpdateOptions<M>["data"],
  ): Promise<InferModel<M> | null> {
    const where = { id } as unknown as UpdateOptions<M>["where"];
    const rows = await this.update({ where, data });
    return rows[0] ?? null;
  }

  /** Delete every row matching `where` and return the deleted rows. `where` must be non-empty. */
  async delete(options: DeleteOptions<M>): Promise<InferModel<M>[]> {
    const query = buildDelete(this.table, this.columnNames, options.where as Record<string, unknown>);
    const result = await this.executor.query<InferModel<M> & Record<string, unknown>>(
      query.text,
      query.values,
    );
    return result.rows;
  }

  /** Convenience wrapper: delete a single row by id, returns it (or null if it didn't exist). */
  async deleteById(
    id: InferModel<M> extends { id: infer Id } ? Id : never,
  ): Promise<InferModel<M> | null> {
    const where = { id } as unknown as DeleteOptions<M>["where"];
    const rows = await this.delete({ where });
    return rows[0] ?? null;
  }
}
