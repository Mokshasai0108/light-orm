/**
 * index.ts
 * --------
 * Public API surface of `@YOUR_USERNAME/light-orm`. Consumers should only
 * ever import from this file (the package's `main`/`exports` entry) —
 * never reach into `dist/schema.js` etc. directly.
 */
export { boolean, defineModel, number, string } from "./schema.js";
export { createDatabase, createDatabaseWithExecutor } from "./client.js";
export { Repository } from "./repository.js";
export {
  buildDelete,
  buildInsert,
  buildSelect,
  buildUpdate,
  buildWhereClause,
  quoteIdent,
} from "./query-builder.js";
export type {
  ColumnDefinition,
  ColumnKind,
  CreateInput,
  DeleteOptions,
  FindOptions,
  InferModel,
  ModelDefinition,
  ModelShape,
  QueryExecutor,
  SQLQuery,
  UpdateInput,
  UpdateOptions,
  WhereInput,
} from "./types.js";
export type { CreateDatabaseOptions, Database } from "./client.js";
