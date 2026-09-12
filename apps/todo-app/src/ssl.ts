import type { PoolConfig } from "pg";

export function resolveSslOption(connectionString: string): PoolConfig["ssl"] {
  let host: string;
  try {
    host = new URL(connectionString).hostname;
  } catch {
    return { rejectUnauthorized: false };
  }

  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1";
  return isLocal ? undefined : { rejectUnauthorized: false };
}
