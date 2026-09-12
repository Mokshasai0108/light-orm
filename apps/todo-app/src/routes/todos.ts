/**
 * routes/todos.ts
 * ---------------
 * REST endpoints for the Todo resource. Every database operation goes
 * through `db.todo` (an instance of `@YOUR_USERNAME/light-orm`'s
 * `Repository`) — there is no raw SQL, no other ORM, and no direct `pg`
 * usage anywhere in this file.
 */
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { Router } from "express";
import type { AppDatabase } from "../db.js";

/** Narrow, request-shaped validation — kept dependency-free on purpose. */
function isValidTitle(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Express 4 does not forward rejected promises from async handlers to the
 * error middleware on its own. This wrapper catches them and calls `next`,
 * so a database error becomes a clean 500 instead of an unhandled rejection.
 */
function asyncHandler(handler: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function createTodosRouter(db: Pick<AppDatabase, "todo">): Router {
  const router = Router();

  // GET /api/todos?completed=true|false
  router.get("/", asyncHandler(async (req, res) => {
    const { completed } = req.query;
    const where =
      completed === "true" ? { completed: true } : completed === "false" ? { completed: false } : undefined;

    const todos = await db.todo.findMany(where ? { where } : {});
    res.json(todos);
  }));

  // POST /api/todos  { title: string }
  router.post("/", asyncHandler(async (req, res) => {
    const { title } = req.body ?? {};
    if (!isValidTitle(title)) {
      res.status(400).json({ error: "`title` is required and must be a non-empty string." });
      return;
    }
    const todo = await db.todo.create({ title: title.trim(), completed: false });
    res.status(201).json(todo);
  }));

  // PATCH /api/todos/:id  { title?: string, completed?: boolean }
  router.patch("/:id", asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "`id` must be an integer." });
      return;
    }

    const { title, completed } = req.body ?? {};
    if (title !== undefined && !isValidTitle(title)) {
      res.status(400).json({ error: "`title`, if provided, must be a non-empty string." });
      return;
    }
    if (completed !== undefined && typeof completed !== "boolean") {
      res.status(400).json({ error: "`completed`, if provided, must be a boolean." });
      return;
    }
    if (title === undefined && completed === undefined) {
      res.status(400).json({ error: "Provide at least one of `title` or `completed`." });
      return;
    }

    const data: { title?: string; completed?: boolean } = {};
    if (title !== undefined) data.title = title.trim();
    if (completed !== undefined) data.completed = completed;

    const updated = await db.todo.updateById(id, data);
    if (!updated) {
      res.status(404).json({ error: `No todo with id ${id}.` });
      return;
    }
    res.json(updated);
  }));

  // DELETE /api/todos/:id
  router.delete("/:id", asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "`id` must be an integer." });
      return;
    }
    const deleted = await db.todo.deleteById(id);
    if (!deleted) {
      res.status(404).json({ error: `No todo with id ${id}.` });
      return;
    }
    res.status(204).end();
  }));

  return router;
}
