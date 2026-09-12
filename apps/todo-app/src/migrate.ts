import "dotenv/config";
import pg from "pg";
import { resolveSslOption } from "./ssl.js";

const CREATE_TODO_TABLE = `
  CREATE TABLE IF NOT EXISTS "todo" (
    "id" SERIAL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false
  );
`;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  }

  const client = new pg.Client({
    connectionString,
    ssl: resolveSslOption(connectionString),
  });

  await client.connect();
  try {
    await client.query(CREATE_TODO_TABLE);
    console.log('Migration complete: "todo" table is ready.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exitCode = 1;
});
