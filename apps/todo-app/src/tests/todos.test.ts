import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { createFakeAppDatabase } from "./fake-db.js";

function setup() {
  const db = createFakeAppDatabase();
  const app = createApp(db);
  return { app, db };
}

describe("GET /api/health", () => {
  it("reports ok", async () => {
    const { app } = setup();
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("POST /api/todos", () => {
  it("creates a todo and returns it with a generated id", async () => {
    const { app } = setup();
    const res = await request(app).post("/api/todos").send({ title: "Buy milk" });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 1, title: "Buy milk", completed: false });
  });

  it("rejects an empty title", async () => {
    const { app } = setup();
    const res = await request(app).post("/api/todos").send({ title: "   " });
    expect(res.status).toBe(400);
  });

  it("rejects a missing title", async () => {
    const { app } = setup();
    const res = await request(app).post("/api/todos").send({});
    expect(res.status).toBe(400);
  });
});

describe("GET /api/todos", () => {
  it("lists all todos", async () => {
    const { app } = setup();
    await request(app).post("/api/todos").send({ title: "Buy milk" });
    await request(app).post("/api/todos").send({ title: "Walk dog" });

    const res = await request(app).get("/api/todos");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("filters by completed=false", async () => {
    const { app } = setup();
    const created = await request(app).post("/api/todos").send({ title: "Buy milk" });
    await request(app).post("/api/todos").send({ title: "Walk dog" });
    await request(app).patch(`/api/todos/${created.body.id}`).send({ completed: true });

    const res = await request(app).get("/api/todos?completed=false");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 2, title: "Walk dog", completed: false }]);
  });

  it("filters by completed=true", async () => {
    const { app } = setup();
    const created = await request(app).post("/api/todos").send({ title: "Buy milk" });
    await request(app).patch(`/api/todos/${created.body.id}`).send({ completed: true });

    const res = await request(app).get("/api/todos?completed=true");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 1, title: "Buy milk", completed: true }]);
  });

  it("returns an empty array when there are no todos", async () => {
    const { app } = setup();
    const res = await request(app).get("/api/todos");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("PATCH /api/todos/:id", () => {
  it("updates completed status", async () => {
    const { app } = setup();
    const created = await request(app).post("/api/todos").send({ title: "Buy milk" });

    const res = await request(app).patch(`/api/todos/${created.body.id}`).send({ completed: true });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: created.body.id, title: "Buy milk", completed: true });
  });

  it("updates the title", async () => {
    const { app } = setup();
    const created = await request(app).post("/api/todos").send({ title: "Buy milk" });

    const res = await request(app).patch(`/api/todos/${created.body.id}`).send({ title: "Buy oat milk" });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Buy oat milk");
  });

  it("404s for a non-existent id", async () => {
    const { app } = setup();
    const res = await request(app).patch("/api/todos/999").send({ completed: true });
    expect(res.status).toBe(404);
  });

  it("400s when neither field is provided", async () => {
    const { app } = setup();
    const created = await request(app).post("/api/todos").send({ title: "Buy milk" });
    const res = await request(app).patch(`/api/todos/${created.body.id}`).send({});
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/todos/:id", () => {
  it("deletes an existing todo", async () => {
    const { app } = setup();
    const created = await request(app).post("/api/todos").send({ title: "Buy milk" });

    const res = await request(app).delete(`/api/todos/${created.body.id}`);
    expect(res.status).toBe(204);

    const list = await request(app).get("/api/todos");
    expect(list.body).toEqual([]);
  });

  it("404s for a non-existent id", async () => {
    const { app } = setup();
    const res = await request(app).delete("/api/todos/999");
    expect(res.status).toBe(404);
  });
});
