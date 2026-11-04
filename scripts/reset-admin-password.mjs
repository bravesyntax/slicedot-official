// Sets a new password for the admin account when the old one is lost, and clears any lockout. Old sessions end.
// Asks in the terminal, so the password never lands in shell history: node --env-file=.env.local scripts/reset-admin-password.mjs
import { Writable } from "node:stream";
import { createInterface } from "node:readline/promises";
import bcrypt from "bcryptjs";
import postgres from "postgres";

const MIN_LENGTH = 10;

let muted = false;
const output = new Writable({
  write(chunk, _encoding, done) {
    if (!muted) process.stdout.write(chunk);
    done();
  },
});
const rl = createInterface({ input: process.stdin, output, terminal: !!process.stdin.isTTY });

async function ask(label) {
  process.stdout.write(label);
  muted = true;
  const answer = await rl.question("");
  muted = false;
  process.stdout.write("\n");
  return answer;
}

const password = await ask(`New admin password (at least ${MIN_LENGTH} characters, hidden as you type): `);
if (password.length < MIN_LENGTH) throw new Error(`Password too short. Nothing changed.`);
if ((await ask("Repeat it: ")) !== password) throw new Error("The passwords don't match. Nothing changed.");
rl.close();

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
try {
  const hash = await bcrypt.hash(password, 12);
  const updated = await sql`
    UPDATE admin_users SET password = ${hash}, login_attempts = 0, locked_until = NULL, status = 'active', updated_at = LOCALTIMESTAMP
    WHERE username = 'admin' RETURNING username
  `;
  if (!updated.length) throw new Error("No admin account found. Nothing changed.");
  console.log(`Password changed. Sign in as "${updated[0].username}"; a code goes to the account's email.`);
} finally {
  await sql.end();
}
