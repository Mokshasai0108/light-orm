/**
 * client.ts
 * ---------
 * The bottom of the architecture diagram: this is where the ORM talks to
 * an actual PostgreSQL driver (`pg`). `createDatabase` is the single public
 * entry point that ties a connection to a set of model definitions and
 * hands back a fully-typed `db` object: `db.todo`, `db.user`, etc.
 */
import { Pool, type PoolConfig } from "pg";
import { Repository } from "./repository.js";
import type { ModelDefinition, ModelShape, QueryExecutor } from "./types.js";

export interface CreateDatabaseOptions<Models extends Record<string, ModelDefinition<string, ModelShape>>> {
  /** A standard PostgreSQL connection string, e.g. from Neon or a local Postgres instance. */
  connectionString: string;
  /** Every model this database instance should expose a repository for. */
  models: Models;
  /**
   * Extra options forwarded to `pg.Pool` (e.g. `ssl`). Neon requires
   * `ssl: { rejectUnauthorized: false }` or `?sslmode=require` in the URL.
   */
  poolOptions?: Omit<PoolConfig, "connectionString">;
}

/** `db.todo`, `db.user`, ... plus lifecycle helpers. */
export type Database<Models extends Record<string, ModelDefinition<string, ModelShape>>> = {
  [K in keyof Models]: Repository<Models[K]>;
} & {
  /** Closes the underlying connection pool. Call this when shutting down (e.g. after tests). */
  $disconnect: () => Promise<void>;
  /** The raw executor, exposed for advanced use (e.g. running migrations/raw SQL). */
  $executor: QueryExecutor;
};

/** Builds the `{ modelName: new Repository(...) }` map shared by both factory functions below. */
function buildRepositories<Models extends Record<string, ModelDefinition<string, ModelShape>>>(
  models: Models,
  executor: QueryExecutor,
): { [K in keyof Models]: Repository<Models[K]> } {
  // Built up as a loosely-typed record, then cast once at the boundary —
  // this sidesteps a TypeScript limitation where assigning into a mapped
  // type keyed by a generic `Models` gets confused with the `$disconnect`/
  // `$executor` members of the surrounding intersection type.
  const repositories: Record<string, Repository<Models[keyof Models]>> = {};
  for (const key of Object.keys(models)) {
    repositories[key] = new Repository(models[key] as Models[keyof Models], executor);
  }
  return repositories as { [K in keyof Models]: Repository<Models[K]> };
}

/**
 * Creates a typed database handle from a connection string and a set of
 * `defineModel(...)` definitions.
 *
 * @example
 * const db = createDatabase({
 *   connectionString: process.env.DATABASE_URL!,
 *   models: { todo: Todo },
 * });
 * const todos = await db.todo.findMany({ where: { completed: false } });
 */
export function createDatabase<Models extends Record<string, ModelDefinition<string, ModelShape>>>(
  options: CreateDatabaseOptions<Models>,
): Database<Models> {
  const pool = new Pool({
    connectionString: options.connectionString,
    ...options.poolOptions,
  });

  const executor: QueryExecutor = {
    query<Row extends Record<string, unknown> = Record<string, unknown>>(
      text: string,
      values?: readonly unknown[],
    ) {
      return pool.query(text, values as unknown[] | undefined) as unknown as Promise<{ rows: Row[] }>;
    },
  };

  const repositories = buildRepositories(options.models, executor);

  return {
    ...repositories,
    $disconnect: () => pool.end(),
    $executor: executor,
  } as Database<Models>;
}

/**
 * Creates a database handle from any object satisfying the minimal
 * `QueryExecutor` interface instead of a real `pg.Pool`. This is what makes
 * the ORM's repository/query-builder logic unit-testable without a live
 * Postgres connection (see tests/repository.test.ts) and is also handy for
 * plugging in a custom pooling/proxy layer.
 */
export function createDatabaseWithExecutor<Models extends Record<string, ModelDefinition<string, ModelShape>>>(
  executor: QueryExecutor,
  models: Models,
): Omit<Database<Models>, "$disconnect"> {
  const repositories = buildRepositories(models, executor);
  return {
    ...repositories,
    $executor: executor,
  } as unknown as Omit<Database<Models>, "$disconnect">;
}
