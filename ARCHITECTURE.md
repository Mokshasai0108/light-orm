# System Architecture & Technical Design

This document details the architectural decisions, type system internals, query generation lifecycle, and design tradeoffs of `@mokshasai0108/light-orm` and the reference Todo application.

---

## 1. High-Level Architecture

`light-orm` is built with a strictly decoupled 4-layer design:

```
┌────────────────────────────────────────────────────────┐
│                   Application Layer                    │
│             (Express Routes / Controllers)             │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                    Model & Schema                      │
│        (defineModel, Column Descriptors, Types)        │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                    Repository API                      │
│        (db.todo.create, findMany, update, delete)      │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               Query Builder (Pure SQL)                 │
│         (Parameterized SQL Generation & $n)            │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                Database Driver (pg)                    │
│             (Connection Pooling & TLS)                 │
└────────────────────────────────────────────────────────┘
```

### Decoupling & Testability
Each layer has single responsibilities:
- **`schema.ts`**: Pure metadata schema descriptors (`number()`, `string()`, `boolean()`).
- **`types.ts`**: Zero-runtime compile-time TypeScript mapping and inference (`InferModel`, `CreateInput`, `WhereInput`, `UpdateInput`).
- **`query-builder.ts`**: Pure functions taking schema definitions and input arguments to generate raw SQL text + parameterized values array (`{ text: string, values: unknown[] }`). Contains zero I/O.
- **`repository.ts`**: Bridges query generation with runtime execution.
- **`client.ts`**: Manages PostgreSQL pool lifecycles and TLS negotiation for serverless/cloud Postgres providers (Supabase / Neon).

---

## 2. Query Lifecycle Example

Tracing `await db.todo.findMany({ where: { completed: false } })`:

```
1. Model Invocation:
   db.todo.findMany({ where: { completed: false } })

2. Query Generation (query-builder.ts):
   - Table name: "todo"
   - Column projection: "id", "title", "completed"
   - Filter extraction: "completed" = $1
   - Parameters: [false]
   => SQL Text: SELECT "id", "title", "completed" FROM "todo" WHERE "completed" = $1
   => Values:   [false]

3. Execution (repository.ts -> pg.Pool):
   pool.query(text, values)

4. Object Mapping & Return:
   Rows returned by driver mapped directly to typed Todo array:
   Promise<Array<{ id: number; title: string; completed: boolean }>>
```

---

## 3. TypeScript Design & Type System

### Runtime to Static Inference (`InferModel`)
The ORM uses TypeScript mapped types and conditional inference to derive pure TypeScript interfaces directly from runtime `defineModel` objects without code generation or decorators:

```ts
export type ColumnType = "number" | "string" | "boolean";

export type InferColumnType<T extends ColumnDescriptor<ColumnType>> =
  T["type"] extends "number"
    ? number
    : T["type"] extends "string"
      ? string
      : T["type"] extends "boolean"
        ? boolean
        : never;

export type InferModel<M extends ModelDefinition<string, Record<string, ColumnDescriptor<ColumnType>>>> = {
  [K in keyof M["shape"]]: InferColumnType<M["shape"][K]>;
};
```

### Strict Compile-Time Safety
1. **`CreateInput<M>`**: Automatically omits the auto-incrementing `id` column:
   ```ts
   export type CreateInput<M> = Omit<InferModel<M>, "id">;
   ```
2. **`WhereInput<M>`**: Allows partial filtering on any declared model column:
   ```ts
   export type WhereInput<M> = Partial<InferModel<M>>;
   ```
3. **`UpdateInput<M>`**: Allows partial updating of any non-id column:
   ```ts
   export type UpdateInput<M> = Partial<Omit<InferModel<M>, "id">>;
   ```

Any mismatch in field types or unknown field keys triggers compile-time TypeScript errors (tested extensively in `type-inference.test-d.ts`).

---

## 4. Security & Parameterization

`light-orm` enforces strict SQL injection prevention by construction:
- **No string interpolation for user input**: Values are never concatenated into SQL text.
- **Strict Parameter Placeholders (`$1`, `$2`, ...)**: All query parameters are passed exclusively in the values array of the PostgreSQL driver.
- **Identifier Escaping**: Identifiers (table and column names) are safely quoted (`"column"`) using schema-validated keys.

---

## 5. Design Tradeoffs & Limitations

| Feature | Decision in `light-orm` | Rationale & Production Next Steps |
| :--- | :--- | :--- |
| **Migrations** | DDL executed via script / auto-init | ORM focuses on runtime data access. A full migration engine would require schema diffing and a `_migrations` tracking table. |
| **Relations** | 1 Model = 1 Table (no joins) | Keeps API footprint minimal and predictable. Production step: add `hasMany`/`belongsTo` with subquery or join builders. |
| **Query Operators** | Equality (`=`) with `AND` | Solves primary CRUD use cases. Production step: add `{ gt, lt, like, in }` operator wrappers. |
| **Primary Keys** | Integer `id` column | Default convention. Production step: support composite and UUID primary keys. |

---

## 6. Monorepo Structure

The monorepo uses standard npm workspaces:
- **`packages/light-orm`**: The standalone, publishable npm library.
- **`apps/todo-app`**: The full-stack reference application importing `@mokshasai0108/light-orm` purely through workspace module resolution.
