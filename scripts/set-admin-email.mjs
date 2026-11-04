// Points the admin account at ADMIN_EMAIL, where sign-in codes go. The dump has an older address, so run this after a
// fresh load-db --force: node --env-file=.env.local scripts/set-admin-email.mjs
import postgres from "postgres";

const email = process.env.ADMIN_EMAIL;
if (!email) throw new Error("ADMIN_EMAIL is not set");
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
try {
  const updated = await sql`UPDATE admin_users SET email = ${email} WHERE username = 'admin' RETURNING id`;
  console.log(`Updated ${updated.length} admin account`);
} finally {
  await sql.end();
}
