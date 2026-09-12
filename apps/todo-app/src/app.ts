import cors from "cors";
import express, { type Express } from "express";
import type { AppDatabase } from "./db.js";
import { createTodosRouter } from "./routes/todos.js";

export function createApp(db: Pick<AppDatabase, "todo">): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/todos", createTodosRouter(db));

  // Centralized error handler so a rejected promise in a route doesn't crash the process.
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  });

  return app;
}
