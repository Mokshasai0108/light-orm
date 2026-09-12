import { createDatabase } from "@YOUR_USERNAME/light-orm";
import { Todo } from "./schema.js";
import { resolveSslOption } from "./ssl.js";

export function createAppDatabase(connectionString: string) {
  return createDatabase({
    connectionString,
    models: { todo: Todo },
    poolOptions: { ssl: resolveSslOption(connectionString) },
  });
}

export type AppDatabase = ReturnType<typeof createAppDatabase>;
