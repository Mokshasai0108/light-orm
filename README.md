# Lightweight TypeScript ORM & Todo App

A type-safe, minimal TypeScript ORM for PostgreSQL (`@mokshasai0108/light-orm`) built from scratch within an npm workspace monorepo, paired with a full-stack reference Todo application.


## Repository Structure

```text
light-orm/
├── packages/
│   └── light-orm/          # Reusable ORM package
│       ├── src/
│       │   ├── schema.ts        # defineModel(), column types (number, string, boolean)
│       │   ├── types.ts         # Type inference (InferModel, CreateInput, WhereInput)
│       │   ├── query-builder.ts # Parameterized SQL generator
│       │   ├── repository.ts    # Typed CRUD API (create, findMany, update, delete)
│       │   ├── client.ts        # createDatabase() with pg pool management
│       │   └── index.ts         # Package entrypoint
│       └── tests/               # 21 unit tests + 7 compile-time typecheck tests
├── apps/
│   └── todo-app/           # Reference application
│       ├── src/                 # Express backend using the ORM
│       │   ├── routes/todos.ts  # CRUD endpoints
│       │   └── tests/           # Integration tests
│       └── frontend/            # React + Vite UI
└── README.md
```

---

## Quickstart

### Prerequisites
- Node.js 18+
- Supabase PostgreSQL database (or compatible Postgres instance)

### 1. Installation

```bash
git clone https://github.com/Mokshasai0108/light-orm.git
cd light-orm
npm install
```

### 2. Database Configuration (Supabase)

1. Create your environment configuration:

```bash
cp .env.example apps/todo-app/.env
```

2. Configure `apps/todo-app/.env` with your **Supabase** database URI:

```env
# Supabase PostgreSQL URI (from Supabase Dashboard -> Settings -> Database -> Connection String -> URI)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
PORT=4000
VITE_API_URL=http://localhost:4000
```

> **Note**: SSL is automatically enabled by the ORM for Supabase connections (`rejectUnauthorized: false`).

3. Run the initial table migration against your Supabase database:

```bash
npm run db:migrate --workspace=todo-app-server
```

### 3. Running the App

```bash
# Start backend server (http://localhost:4000)
npm run dev:server

# Start frontend application (http://localhost:5173)
npm run dev:frontend
```

---

## ORM Usage & API

```ts
import { boolean, createDatabase, defineModel, number, string } from "@mokshasai0108/light-orm";

// 1. Define Model
const Todo = defineModel("todo", {
  id: number(),
  title: string(),
  completed: boolean(),
});

// 2. Initialize Database Client
const db = createDatabase({
  connectionString: process.env.DATABASE_URL!,
  models: { todo: Todo },
});

// 3. Create
const todo = await db.todo.create({ title: "Write documentation", completed: false });

// 4. Read & Filter
const all = await db.todo.findMany();
const incomplete = await db.todo.findMany({ where: { completed: false } });
const specific = await db.todo.findFirst({ where: { id: todo.id } });

// 5. Update
const [updated] = await db.todo.update({ where: { id: todo.id }, data: { completed: true } });
const byId = await db.todo.updateById(todo.id, { title: "Updated Title" });

// 6. Delete
await db.todo.delete({ where: { id: todo.id } });
await db.todo.deleteById(todo.id);

// 7. TypeScript Inference
type TodoType = InferModel<typeof Todo>; // { id: number; title: string; completed: boolean }
```

---

## Query Architecture

Every ORM operation passes through four decoupled layers:

```
Model Definition  ──►  Repository API  ──►  Query Builder  ──►  PostgreSQL Driver
(defineModel)         (db.todo.findMany)    (SQL Generator)     (node-postgres)
```

1. **Model & Type Layer**: Validates column types at compile-time.
2. **Repository**: Exposes typed CRUD operations.
3. **Query Builder**: Produces strictly parameterized SQL strings (`$1`, `$2`) to prevent SQL injection vulnerabilities.
4. **Database Client**: Manages `pg.Pool` connection lifecycle and query execution.

For detailed design decisions, refer to [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## Testing

```bash
# Run all workspace test suites
npm test

# Run ORM unit tests
npm run test:orm

# Run TypeScript compile-time typecheck tests (verifies @ts-expect-error on invalid fields)
npm run test:types --workspace=@mokshasai0108/light-orm

# Run backend integration tests
npm run test:app
```

---

## Deployment & Links

- **npm Package**: `@mokshasai0108/light-orm` (configured in `packages/light-orm/package.json`)
- **Live Demo**: `https://light-orm.onrender.com`
- **GitHub Repository**: `https://github.com/Mokshasai0108/light-orm`

---

## Known Limitations

- **No Migrations Engine**: DDL migrations are performed via direct script execution (`migrate.ts`).
- **No Relations**: Foreign key / join associations (`hasMany`, `belongsTo`) are not implemented.
- **Equality-Only WHERE Clauses**: Filter conditions support `{ field: value }` with `AND` operations. Advanced operators (`>`, `<`, `LIKE`, `IN`) are not supported.
- **Single Integer Primary Key**: Models require an integer `id` column.
