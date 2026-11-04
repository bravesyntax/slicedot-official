// Loads db/schema.sql + db/data.sql into the Postgres database in DATABASE_URL.
// Usage: node --env-file=.env.local scripts/load-db.mjs [--force]
// Refuses to run if any app table already has rows, unless --force is passed
// (schema.sql drops and recreates every table).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const dbDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "db");
const schema = fs.readFileSync(path.join(dbDir, "schema.sql"), "utf8");
const data = fs.readFileSync(path.join(dbDir, "data.sql"), "utf8");

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice: () => {} });
try {
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`;
  console.log(`Existing tables: ${tables.length}`);
  if (!process.argv.includes("--force")) {
    for (const { table_name } of tables) {
      const [c] = await sql.unsafe(`SELECT EXISTS (SELECT 1 FROM "${table_name}") AS has_rows`);
      if (c.has_rows) {
        console.error(`Table "${table_name}" already has data. Re-run with --force to drop and reload everything.`);
        process.exit(1);
      }
    }
  }
  await sql.begin(async (tx) => {
    await tx.unsafe(schema);
    await tx.unsafe(data);
  });
  const loaded = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY 1`;
  for (const { table_name } of loaded) {
    const [c] = await sql.unsafe(`SELECT count(*)::int AS n FROM "${table_name}"`);
    console.log(table_name.padEnd(30), c.n);
  }
  console.log(`Loaded ${loaded.length} tables.`);
} catch (err) {
  console.error("Load failed, rolled back:", err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
