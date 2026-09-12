/**
 * fake-db.ts
 * ----------
 * A tiny in-memory stand-in for the `todo` table, used only by tests. It
 * implements the same `QueryExecutor` interface `pg.Pool` satisfies, so we
 * can build a real `AppDatabase` (via `createDatabaseWithExecutor`) and run
 * the *actual* Repository + query-builder code against it — the only thing
 * being faked is the network round-trip to Postgres.
 */
import { createDatabaseWithExecutor } from "@YOUR_USERNAME/light-orm";
import type { QueryExecutor } from "@YOUR_USERNAME/light-orm";
import { Todo } from "../schema.js";

interface Row {
  id: number;
  title: string;
  completed: boolean;
}

export function createFakeAppDatabase() {
  let rows: Row[] = [];
  let nextId = 1;

  const executor: QueryExecutor = {
    async query<QRow extends Record<string, unknown> = Record<string, unknown>>(
      text: string,
      values: readonly unknown[] = [],
    ): Promise<{ rows: QRow[] }> {
      if (text.startsWith("INSERT")) {
        const row: Row = { id: nextId++, title: values[0] as string, completed: values[1] as boolean };
        rows.push(row);
        return { rows: [row] as unknown as QRow[] };
      }

      if (text.startsWith("SELECT")) {
        const idMatch = text.match(/"id" = \$(\d+)/);
        const completedMatch = text.match(/"completed" = \$(\d+)/);
        let result = rows;
        if (idMatch) {
          const idx = Number(idMatch[1]) - 1;
          result = result.filter((r) => r.id === values[idx]);
        }
        if (completedMatch) {
          const idx = Number(completedMatch[1]) - 1;
          result = result.filter((r) => r.completed === values[idx]);
        }
        return { rows: result as unknown as QRow[] };
      }

      if (text.startsWith("UPDATE")) {
        // last value is always the id, per buildUpdate's placeholder ordering
        const idValue = values[values.length - 1] as number;
        const setsTitle = text.includes('"title" = $1');
        const setsCompleted = text.includes('"completed" = $');
        rows = rows.map((r) => {
          if (r.id !== idValue) return r;
          const next = { ...r };
          if (setsTitle) next.title = values[0] as string;
          if (setsCompleted) {
            const completedIdx = text.includes('"title" = $1') ? 1 : 0;
            next.completed = values[completedIdx] as boolean;
          }
          return next;
        });
        return { rows: rows.filter((r) => r.id === idValue) as unknown as QRow[] };
      }

      if (text.startsWith("DELETE")) {
        const idValue = values[0] as number;
        const deleted = rows.filter((r) => r.id === idValue);
        rows = rows.filter((r) => r.id !== idValue);
        return { rows: deleted as unknown as QRow[] };
      }

      throw new Error(`fake-db: unhandled query: ${text}`);
    },
  };

  return createDatabaseWithExecutor(executor, { todo: Todo });
}
