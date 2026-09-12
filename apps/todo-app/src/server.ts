import "dotenv/config";
import { createApp } from "./app.js";
import { createAppDatabase } from "./db.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

const db = createAppDatabase(connectionString);
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
