import { describe, expect, it } from "vitest";
import { boolean, defineModel, number, string } from "../src/schema.js";
import { Repository } from "../src/repository.js";
import type { QueryExecutor } from "../src/types.js";

const Todo = defineModel("todo", {
  id: number(),
  title: string(),
  completed: boolean(),
});

/**
 * A minimal in-memory fake of the `pg`-like executor so these tests exercise
 * real SQL generation + repository logic without needing a live Postgres
 * connection. Each call records the exact `(text, values)` it received so
 * we can assert on parameterization as well as behaviour.
 */
function createFakeExecutor(rows: Record<string, unknown>[] = []) {
  let table = [...rows];
  let nextId = table.length + 1;
  const calls: { text: string; values: readonly unknown[] }[] = [];

  const executor: QueryExecutor = {
    async query<Row extends Record<string, unknown> = Record<string, unknown>>(
      text: string,
      values: readonly unknown[] = [],
    ): Promise<{ rows: Row[] }> {
      calls.push({ text, values });

      if (text.startsWith("INSERT")) {
        const row = { id: nextId++, title: values[0], completed: values[1] };
        table.push(row);
        return { rows: [row] as unknown as Row[] };
      }

      if (text.startsWith("SELECT")) {
        if (text.includes("WHERE")) {
          // Only supports the simple single/double equality filters this test suite needs.
          const filtered = table.filter((row) => {
            if (text.includes('"completed" = $1') && !text.includes("AND")) {
              return row.completed === values[0];
            }
            if (text.includes('"id" = $1') && !text.includes("AND")) {
              return row.id === values[0];
            }
            return true;
          });
          return { rows: filtered as unknown as Row[] };
        }
        return { rows: table as unknown as Row[] };
      }

      if (text.startsWith("UPDATE")) {
        const idValue = values[values.length - 1];
        table = table.map((row) =>
          row.id === idValue ? { ...row, completed: values[0] } : row,
        );
        const updated = table.filter((row) => row.id === idValue);
        return { rows: updated as unknown as Row[] };
      }

      if (text.startsWith("DELETE")) {
        const idValue = values[0];
        const deleted = table.filter((row) => row.id === idValue);
        table = table.filter((row) => row.id !== idValue);
        return { rows: deleted as unknown as Row[] };
      }

      throw new Error(`unhandled query in fake executor: ${text}`);
    },
  };

  return { executor, calls, table: () => table };
}

describe("Repository.create", () => {
  it("inserts a row and returns it with a generated id", async () => {
    const { executor } = createFakeExecutor();
    const repo = new Repository(Todo, executor);

    const created = await repo.create({ title: "Buy milk", completed: false });

    expect(created).toEqual({ id: 1, title: "Buy milk", completed: false });
  });
});

describe("Repository.findMany / findFirst", () => {
  const seed = [
    { id: 1, title: "Buy milk", completed: false },
    { id: 2, title: "Walk dog", completed: true },
  ];

  it("returns all rows when no filter is given", async () => {
    const { executor } = createFakeExecutor(seed);
    const repo = new Repository(Todo, executor);

    const all = await repo.findMany();
    expect(all).toHaveLength(2);
  });

  it("filters by an equality condition", async () => {
    const { executor } = createFakeExecutor(seed);
    const repo = new Repository(Todo, executor);

    const active = await repo.findMany({ where: { completed: false } });
    expect(active).toEqual([{ id: 1, title: "Buy milk", completed: false }]);
  });

  it("findFirst returns null when nothing matches", async () => {
    const { executor } = createFakeExecutor(seed);
    const repo = new Repository(Todo, executor);

    const result = await repo.findFirst({ where: { id: 999 } });
    expect(result).toBeNull();
  });
});

describe("Repository.update / updateById", () => {
  it("updates the matching row and returns the new value", async () => {
    const seed = [{ id: 1, title: "Buy milk", completed: false }];
    const { executor } = createFakeExecutor(seed);
    const repo = new Repository(Todo, executor);

    const [updated] = await repo.update({ where: { id: 1 }, data: { completed: true } });
    expect(updated).toEqual({ id: 1, title: "Buy milk", completed: true });
  });

  it("updateById is a convenience wrapper around update", async () => {
    const seed = [{ id: 1, title: "Buy milk", completed: false }];
    const { executor } = createFakeExecutor(seed);
    const repo = new Repository(Todo, executor);

    const updated = await repo.updateById(1, { completed: true });
    expect(updated?.completed).toBe(true);
  });
});

describe("Repository.delete / deleteById", () => {
  it("deletes the matching row and returns it", async () => {
    const seed = [{ id: 1, title: "Buy milk", completed: false }];
    const { executor } = createFakeExecutor(seed);
    const repo = new Repository(Todo, executor);

    const deleted = await repo.deleteById(1);
    expect(deleted).toEqual({ id: 1, title: "Buy milk", completed: false });

    const remaining = await repo.findMany();
    expect(remaining).toHaveLength(0);
  });
});

describe("Repository never inlines values into SQL text", () => {
  it("always sends the executor placeholders, with real values only in `values`", async () => {
    const { executor, calls } = createFakeExecutor();
    const repo = new Repository(Todo, executor);

    await repo.create({ title: `'; DROP TABLE todo; --`, completed: false });

    const insertCall = calls.find((c) => c.text.startsWith("INSERT"));
    expect(insertCall?.text).not.toContain("DROP TABLE");
    expect(insertCall?.values).toContain(`'; DROP TABLE todo; --`);
  });
});
