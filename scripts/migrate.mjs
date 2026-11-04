// Applies one SQL migration file: node --env-file=.env.local scripts/migrate.mjs db/migrations/<file>.sql
import { readFileSync } from "node:fs";
import postgres from "postgres";

const file = process.argv[2];
if (!file) throw new Error("Usage: node --env-file=.env.local scripts/migrate.mjs <file.sql>");
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
try {
  await sql.begin((tx) => tx.unsafe(readFileSync(file, "utf8")));
  console.log(`Applied ${file}`);
} finally {
  await sql.end();
}
