import "dotenv/config";
import pg from "pg";
import { createApp } from "./app.js";
import { createAppDatabase } from "./db.js";
import { resolveSslOption } from "./ssl.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Please set DATABASE_URL environment variable.");
  process.exit(1);
}

const connStr: string = connectionString;

const CREATE_TODO_TABLE = `
  CREATE TABLE IF NOT EXISTS "todo" (
    "id" SERIAL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false
  );
`;

async function startServer() {
  try {
    // Automatically ensure the todo table exists in PostgreSQL
    const client = new pg.Client({
      connectionString: connStr,
      ssl: resolveSslOption(connStr),
    });
    await client.connect();
    await client.query(CREATE_TODO_TABLE);
    await client.end();
    console.log('Database initialized: "todo" table ready.');
  } catch (err) {
    console.error("Warning: Failed to auto-initialize database table:", err);
  }

  const db = createAppDatabase(connStr);
  const app = createApp(db);
  const port = Number(process.env.PORT) || 4000;

  const server = app.listen(port, () => {
    console.log(`Todo API listening on http://localhost:${port}`);
  });

  async function shutdown() {
    console.log("Shutting down...");
    server.close();
    await db.$disconnect();
    process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startServer();
