import { describe, expect, it } from "vitest";
import { buildDelete, buildInsert, buildSelect, buildUpdate, quoteIdent } from "../src/query-builder.js";

const columns = ["id", "title", "completed"] as const;

describe("quoteIdent", () => {
  it("wraps an identifier in double quotes", () => {
    expect(quoteIdent("todo")).toBe('"todo"');
  });

  it("escapes embedded double quotes defensively", () => {
    expect(quoteIdent('weird"name')).toBe('"weird""name"');
  });
});

describe("buildSelect", () => {
  it("selects all declared columns with no where clause", () => {
    const query = buildSelect("todo", columns);
    expect(query.text).toBe('SELECT "id", "title", "completed" FROM "todo"');
    expect(query.values).toEqual([]);
  });

  it("adds a single WHERE condition as a parameterized placeholder", () => {
    const query = buildSelect("todo", columns, { completed: false });
    expect(query.text).toBe(
      'SELECT "id", "title", "completed" FROM "todo" WHERE "completed" = $1',
    );
    expect(query.values).toEqual([false]);
  });

  it("ANDs multiple WHERE conditions together, in a stable order", () => {
    const query = buildSelect("todo", columns, { completed: false, title: "Buy milk" });
    expect(query.text).toBe(
      'SELECT "id", "title", "completed" FROM "todo" WHERE "completed" = $1 AND "title" = $2',
    );
    expect(query.values).toEqual([false, "Buy milk"]);
  });

  it("ignores undefined filter values instead of emitting `= $n`", () => {
    const query = buildSelect("todo", columns, { completed: undefined, title: "x" });
    expect(query.text).toBe(
      'SELECT "id", "title", "completed" FROM "todo" WHERE "title" = $1',
    );
    expect(query.values).toEqual(["x"]);
  });
});

describe("buildInsert", () => {
  it("builds a parameterized INSERT ... RETURNING", () => {
    const query = buildInsert("todo", columns, { title: "Test", completed: false });
    expect(query.text).toBe(
      'INSERT INTO "todo" ("title", "completed") VALUES ($1, $2) RETURNING "id", "title", "completed"',
    );
    expect(query.values).toEqual(["Test", false]);
  });
});

describe("buildUpdate", () => {
  it("builds a parameterized UPDATE ... WHERE ... RETURNING with continuous placeholder indices", () => {
    const query = buildUpdate("todo", columns, { completed: true }, { id: 7 });
    expect(query.text).toBe(
      'UPDATE "todo" SET "completed" = $1 WHERE "id" = $2 RETURNING "id", "title", "completed"',
    );
    expect(query.values).toEqual([true, 7]);
  });

  it("throws if data has no fields to set", () => {
    expect(() => buildUpdate("todo", columns, {}, { id: 1 })).toThrow(/at least one field/i);
  });
});

describe("buildDelete", () => {
  it("builds a parameterized DELETE ... WHERE ... RETURNING", () => {
    const query = buildDelete("todo", columns, { id: 3 });
    expect(query.text).toBe('DELETE FROM "todo" WHERE "id" = $1 RETURNING "id", "title", "completed"');
    expect(query.values).toEqual([3]);
  });

  it("refuses to build an unconditional DELETE (safety guard)", () => {
    expect(() => buildDelete("todo", columns, {})).toThrow(/non-empty `where`/i);
  });
});

describe("parameterization / SQL injection resistance", () => {
  it("never interpolates a hostile value into the SQL text", () => {
    const hostile = `x'); DROP TABLE todo; --`;
    const query = buildSelect("todo", columns, { title: hostile });
    expect(query.text).not.toContain("DROP TABLE");
    expect(query.text).toBe('SELECT "id", "title", "completed" FROM "todo" WHERE "title" = $1');
    // The hostile string travels as a bound parameter, never as raw SQL text.
    expect(query.values).toEqual([hostile]);
  });

  it("passes every value as a placeholder even across multiple conditions", () => {
    const query = buildUpdate(
      "todo",
      columns,
      { title: `'; DROP TABLE todo; --` },
      { completed: false },
    );
    expect(query.text).toBe('UPDATE "todo" SET "title" = $1 WHERE "completed" = $2 RETURNING "id", "title", "completed"');
    expect(query.values[0]).toContain("DROP TABLE");
    expect(query.text).not.toContain("DROP TABLE");
  });
});
