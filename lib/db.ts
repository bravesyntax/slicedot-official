import "server-only";
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// Tagged-template SQL client: sql`SELECT * FROM t WHERE id = ${id}`.
// Interpolated values are sent as bound parameters, never concatenated.
// prepare: false because the URL points at a connection pooler; max is low because each serverless instance has its own.
export const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 3, idle_timeout: 20 });

/** Types a query's rows: `await rows<User>(sql\`SELECT …\`)`. */
export const rows = <T>(query: PromiseLike<unknown>) => query as Promise<T[]>;
