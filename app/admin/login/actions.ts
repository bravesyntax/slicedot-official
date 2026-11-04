"use server";

import bcrypt from "bcryptjs";
import { randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  keyedHash,
  OTP_COOKIE,
  OTP_TTL_SECONDS,
  passwordFingerprint,
  SESSION_COOKIE,
  sessionCookieOptions,
  sessionsConfigured,
  signOtpTicket,
  signSession,
  verifyOtpTicket,
} from "@/lib/admin/session";
import { rows, sql } from "@/lib/db";
import { escapeHtml, mailConfigured, sendMail } from "@/lib/mailer";
import { field, getClientIp } from "@/lib/validation";

// Two-step admin sign-in: password, then a 6-digit code emailed to the account's address.
//  - Per account: 5 wrong passwords lock it for 15 minutes.
//  - Per IP: 10 failed passwords in 15 minutes block further tries (stops one client locking accounts at will
//    or spraying passwords across usernames).
//  - Codes: hashed at rest, 10-minute expiry, single use, 5 guesses each, resend after 60 s, max 5 per 15 min.

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const IP_MAX_FAILURES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_SECONDS = 60;
const OTP_MAX_PER_WINDOW = 5;
const GENERIC_FAIL = "Invalid username or password.";
const THROTTLED = `Too many attempts. Please try again in ${LOCKOUT_MINUTES} minutes.`;
// Compared against when the username is unknown, so a miss takes as long as a real check. Nothing can match it.
const DUMMY_HASH = bcrypt.hashSync(randomBytes(32).toString("hex"), 10);

export type LoginState = { error: string; username?: string };
export type OtpState = { error: string; notice?: string };

type AdminRow = { id: number; username: string; email: string; full_name: string | null; password: string; login_attempts: number | null; locked: boolean };

const otpCookieOptions = { ...sessionCookieOptions, path: "/admin", maxAge: OTP_TTL_SECONDS };
const ipKey = async () => (await getClientIp()) ?? "unknown";

async function recordFailure(ip: string, username: string) {
  await sql`INSERT INTO admin_login_failures (ip_address, username) VALUES (${ip}, ${username.slice(0, 100)})`;
}

/** Creates a fresh code (voiding earlier ones), emails it and sets the pending-step cookie. */
async function issueCode(user: Pick<AdminRow, "id" | "email" | "full_name" | "username">, ip: string): Promise<string | null> {
  const [{ n }] = await rows<{ n: number }>(sql`
    SELECT COUNT(*)::int AS n FROM admin_login_otps WHERE user_id = ${user.id} AND created_at > LOCALTIMESTAMP - INTERVAL '15 minutes'
  `);
  if (n >= OTP_MAX_PER_WINDOW) return "Too many codes requested. Please wait 15 minutes and sign in again.";

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await sql`UPDATE admin_login_otps SET consumed_at = LOCALTIMESTAMP WHERE user_id = ${user.id} AND consumed_at IS NULL`;
  const [{ id }] = await rows<{ id: number }>(sql`
    INSERT INTO admin_login_otps (user_id, code_hash, ip_address, expires_at)
    VALUES (${user.id}, ${await keyedHash(`${user.id}:${code}`)}, ${ip}, LOCALTIMESTAMP + make_interval(secs => ${OTP_TTL_SECONDS}))
    RETURNING id
  `);

  if (mailConfigured()) {
    const html = `<p>Hi ${escapeHtml(user.full_name || user.username)},</p><p>Your SliceDot admin sign-in code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>It expires in ${OTP_TTL_SECONDS / 60} minutes. If you didn't try to sign in, change your admin password.</p>`;
    if (!(await sendMail({ to: user.email, subject: `${code} is your SliceDot admin code`, html }))) {
      await sql`UPDATE admin_login_otps SET consumed_at = LOCALTIMESTAMP WHERE id = ${id}`;
      return "We couldn't send the verification email. Check the SMTP settings and try again.";
    }
  } else if (process.env.NODE_ENV === "production") {
    // Fail closed: without email there is no second factor, so production sign-in is refused.
    await sql`UPDATE admin_login_otps SET consumed_at = LOCALTIMESTAMP WHERE id = ${id}`;
    return "Sign-in needs email to be configured (SMTP_PASSWORD) to send verification codes.";
  } else {
    console.info(`[admin login] SMTP not configured — development sign-in code for ${user.username}: ${code}`);
  }

  (await cookies()).set(OTP_COOKIE, await signOtpTicket({ uid: user.id, oid: id }), otpCookieOptions);
  return null;
}

export async function login(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const result = await checkPassword(fd);
  return { ...result, username: field(fd, "username").slice(0, 100) };
}

async function checkPassword(fd: FormData): Promise<{ error: string }> {
  if (!sessionsConfigured()) return { error: "Admin sign-in is not configured (SESSION_SECRET is missing)." };

  const username = field(fd, "username");
  const password = String(fd.get("password") ?? "");
  if (!username || !password) return { error: "Enter your username and password." };

  const ip = await ipKey();
  // Housekeeping, then the per-IP limit.
  await sql`DELETE FROM admin_login_failures WHERE created_at < LOCALTIMESTAMP - INTERVAL '1 day'`;
  await sql`DELETE FROM admin_login_otps WHERE created_at < LOCALTIMESTAMP - INTERVAL '1 day'`;
  const [{ n: ipFailures }] = await rows<{ n: number }>(sql`
    SELECT COUNT(*)::int AS n FROM admin_login_failures WHERE ip_address = ${ip} AND created_at > LOCALTIMESTAMP - make_interval(mins => ${LOCKOUT_MINUTES})
  `);
  if (ipFailures >= IP_MAX_FAILURES) return { error: THROTTLED };

  const [user] = await rows<AdminRow>(sql`
    SELECT id, username, email, full_name, password, login_attempts, COALESCE(locked_until > LOCALTIMESTAMP, false) AS locked
    FROM admin_users WHERE username = ${username} AND status = 'active' LIMIT 1
  `);
  if (!user) {
    // Same bcrypt work as a real check, so timing doesn't reveal which usernames exist.
    await bcrypt.compare(password, DUMMY_HASH);
    await recordFailure(ip, username);
    return { error: GENERIC_FAIL };
  }
  // Compared in SQL: timestamps are stored without a time zone, so JS Date math would be off by the server's offset.
  if (user.locked) return { error: THROTTLED };

  if (!(await bcrypt.compare(password, user.password))) {
    const attempts = (user.login_attempts ?? 0) + 1;
    await sql`
      UPDATE admin_users SET login_attempts = ${attempts >= MAX_LOGIN_ATTEMPTS ? 0 : attempts},
        locked_until = CASE WHEN ${attempts >= MAX_LOGIN_ATTEMPTS}::boolean THEN LOCALTIMESTAMP + make_interval(mins => ${LOCKOUT_MINUTES}) ELSE locked_until END
      WHERE id = ${user.id}
    `;
    await recordFailure(ip, username);
    return { error: attempts >= MAX_LOGIN_ATTEMPTS ? THROTTLED : GENERIC_FAIL };
  }

  await sql`UPDATE admin_users SET login_attempts = 0, locked_until = NULL WHERE id = ${user.id}`;
  const err = await issueCode(user, ip);
  if (err) return { error: err };
  redirect("/admin/login");
}

export async function verifyLoginCode(_prev: OtpState, fd: FormData): Promise<OtpState> {
  const jar = await cookies();
  const ticket = await verifyOtpTicket(jar.get(OTP_COOKIE)?.value);
  const restart = async (error: string): Promise<OtpState> => {
    jar.set(OTP_COOKIE, "", { ...otpCookieOptions, maxAge: 0 });
    return { error };
  };
  if (!ticket) return restart("Your sign-in session expired. Please sign in again.");

  const code = String(fd.get("code") ?? "").replace(/\D/g, "");
  if (code.length !== 6) return { error: "Enter the 6-digit code from the email." };

  const [otp] = await rows<{ code_hash: string; attempts: number; expired: boolean; consumed_at: Date | null }>(sql`
    SELECT code_hash, attempts, expires_at < LOCALTIMESTAMP AS expired, consumed_at
    FROM admin_login_otps WHERE id = ${ticket.oid} AND user_id = ${ticket.uid}
  `);
  if (!otp || otp.consumed_at || otp.expired || otp.attempts >= OTP_MAX_ATTEMPTS) {
    return restart("This code has expired. Please sign in again to get a new one.");
  }

  const expected = Buffer.from(otp.code_hash, "hex");
  const given = Buffer.from(await keyedHash(`${ticket.uid}:${code}`), "hex");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    const attempts = otp.attempts + 1;
    await sql`
      UPDATE admin_login_otps SET attempts = ${attempts}, consumed_at = CASE WHEN ${attempts >= OTP_MAX_ATTEMPTS}::boolean THEN LOCALTIMESTAMP ELSE NULL END
      WHERE id = ${ticket.oid}
    `;
    if (attempts >= OTP_MAX_ATTEMPTS) return restart("Too many incorrect codes. Please sign in again.");
    return { error: `Incorrect code. ${OTP_MAX_ATTEMPTS - attempts} attempt${OTP_MAX_ATTEMPTS - attempts === 1 ? "" : "s"} left.` };
  }

  // Single use: only the request that flips consumed_at from NULL may sign in.
  const claimed = await rows<{ id: number }>(sql`UPDATE admin_login_otps SET consumed_at = LOCALTIMESTAMP WHERE id = ${ticket.oid} AND consumed_at IS NULL RETURNING id`);
  if (!claimed.length) return restart("This code was already used. Please sign in again.");

  const [user] = await rows<{ id: number; username: string; password: string }>(sql`
    SELECT id, username, password FROM admin_users WHERE id = ${ticket.uid} AND status = 'active'
  `);
  if (!user) return restart("This account is no longer active.");

  await sql`UPDATE admin_users SET last_login = LOCALTIMESTAMP WHERE id = ${user.id}`;
  jar.set(OTP_COOKIE, "", { ...otpCookieOptions, maxAge: 0 });
  jar.set(SESSION_COOKIE, await signSession({ uid: user.id, u: user.username, pv: await passwordFingerprint(user.password) }), sessionCookieOptions);
  redirect("/admin");
}

export async function resendLoginCode(): Promise<OtpState> {
  const jar = await cookies();
  const ticket = await verifyOtpTicket(jar.get(OTP_COOKIE)?.value);
  if (!ticket) return { error: "Your sign-in session expired. Please sign in again." };

  const [last] = await rows<{ age: number }>(sql`
    SELECT EXTRACT(EPOCH FROM (LOCALTIMESTAMP - created_at))::int AS age FROM admin_login_otps
    WHERE user_id = ${ticket.uid} ORDER BY created_at DESC LIMIT 1
  `);
  if (last && last.age < OTP_RESEND_SECONDS) return { error: `Please wait ${OTP_RESEND_SECONDS - last.age}s before requesting another code.` };

  const [user] = await rows<Pick<AdminRow, "id" | "email" | "full_name" | "username">>(sql`
    SELECT id, email, full_name, username FROM admin_users WHERE id = ${ticket.uid} AND status = 'active'
  `);
  if (!user) return { error: "This account is no longer active." };
  const err = await issueCode(user, await ipKey());
  return err ? { error: err } : { error: "", notice: "A new code is on its way. Earlier codes no longer work." };
}

export async function cancelLogin() {
  (await cookies()).set(OTP_COOKIE, "", { ...otpCookieOptions, maxAge: 0 });
  redirect("/admin/login");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

