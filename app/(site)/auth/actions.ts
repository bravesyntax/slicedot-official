"use server";

import { randomInt } from "node:crypto";
import { clearCustomerSession, findOrCreateCustomer, getCustomer, keyedHash, needsProfile, sameHash, setCustomerSession } from "@/lib/auth/session";
import { mergeGuestCart } from "@/lib/cart";
import { rows, sql } from "@/lib/db";
import { escapeHtml, sendMail } from "@/lib/mailer";
import { getClientIp, isValidEmail } from "@/lib/validation";

const EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 60;
const MAX_PER_EMAIL = 5; // codes per 15 minutes
const MAX_PER_IP = 20; // codes per hour

export type AuthResult = { ok: boolean; message?: string; waitSeconds?: number; needsProfile?: boolean };

const normalize = (email: string) => email.trim().toLowerCase();
const codeHash = (email: string, code: string) => keyedHash(`otp:${email}:${code}`);

// The reply never says whether an account exists: anyone could use that to test which emails are customers.
export async function requestOtp(rawEmail: string): Promise<AuthResult> {
  const email = normalize(String(rawEmail ?? ""));
  if (!isValidEmail(email) || email.length > 100) return { ok: false, message: "Please enter a valid email address." };

  const ip = await getClientIp();
  const [limits] = await rows<{ wait: number; recent: number; from_ip: number }>(sql`
    SELECT
      COALESCE((SELECT CEIL(EXTRACT(EPOCH FROM created_at + ${COOLDOWN_SECONDS}::int * INTERVAL '1 second' - LOCALTIMESTAMP))::int FROM otp_codes
                WHERE email = ${email}::text AND created_at > LOCALTIMESTAMP - ${COOLDOWN_SECONDS}::int * INTERVAL '1 second' ORDER BY created_at DESC LIMIT 1), 0) AS wait,
      (SELECT count(*)::int FROM otp_codes WHERE email = ${email}::text AND created_at > LOCALTIMESTAMP - INTERVAL '15 minutes') AS recent,
      (SELECT count(*)::int FROM otp_codes WHERE ip_address = ${ip}::text AND created_at > LOCALTIMESTAMP - INTERVAL '1 hour') AS from_ip
  `);
  if (limits.wait > 0) return { ok: false, message: `Please wait ${limits.wait} seconds before requesting a new code.`, waitSeconds: limits.wait };
  if (limits.recent >= MAX_PER_EMAIL || limits.from_ip >= MAX_PER_IP) return { ok: false, message: "Too many codes requested. Please try again later." };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  // A new code replaces any earlier one.
  await sql`UPDATE otp_codes SET is_used = 1 WHERE email = ${email} AND is_used = 0`;
  const [row] = await rows<{ id: number }>(sql`
    INSERT INTO otp_codes (email, otp_hash, purpose, expires_at, ip_address)
    VALUES (${email}, ${codeHash(email, code)}, 'login', LOCALTIMESTAMP + ${EXPIRY_MINUTES}::int * INTERVAL '1 minute', ${ip})
    RETURNING id
  `);

  // example.com can't receive mail: local testing reads the code from the server log.
  if (process.env.NODE_ENV !== "production" && email.endsWith("@example.com")) {
    console.log(`[dev otp] ${email}: ${code}`);
    return { ok: true, waitSeconds: COOLDOWN_SECONDS };
  }

  const sent = await sendMail({
    to: email,
    subject: `${code} is your SliceDot sign-in code`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#171717">
      <h2 style="margin:0 0 12px">Your sign-in code</h2>
      <p style="margin:0 0 20px;color:#525252">Enter this code to sign in to SliceDot.</p>
      <p style="margin:0 0 20px;font-size:32px;font-weight:700;letter-spacing:8px">${escapeHtml(code)}</p>
      <p style="margin:0;font-size:14px;color:#737373">It expires in ${EXPIRY_MINUTES} minutes. If you didn't ask for it, you can ignore this email.</p>
    </div>`,
  });
  if (!sent) {
    await sql`DELETE FROM otp_codes WHERE id = ${row.id}`;
    return { ok: false, message: "We couldn't send the email. Please try again in a moment." };
  }
  return { ok: true, waitSeconds: COOLDOWN_SECONDS };
}

export async function verifyOtp(rawEmail: string, rawCode: string): Promise<AuthResult> {
  const email = normalize(String(rawEmail ?? ""));
  const code = String(rawCode ?? "").replace(/\D/g, "");
  if (!isValidEmail(email) || code.length !== 6) return { ok: false, message: "Please enter the 6-digit code." };

  const [otp] = await rows<{ id: number; otp_hash: string; attempts: number }>(sql`
    SELECT id, otp_hash, COALESCE(attempts, 0) AS attempts FROM otp_codes
    WHERE email = ${email} AND purpose = 'login' AND is_used = 0 AND expires_at > LOCALTIMESTAMP
    ORDER BY created_at DESC LIMIT 1
  `);
  if (!otp) return { ok: false, message: "This code has expired. Please request a new one." };
  if (otp.attempts >= MAX_ATTEMPTS) return { ok: false, message: "Too many wrong attempts. Please request a new code." };

  if (!sameHash(otp.otp_hash, codeHash(email, code))) {
    const [{ attempts }] = await rows<{ attempts: number }>(sql`UPDATE otp_codes SET attempts = COALESCE(attempts, 0) + 1 WHERE id = ${otp.id} RETURNING attempts`);
    const left = MAX_ATTEMPTS - attempts;
    return { ok: false, message: left > 0 ? `Wrong code. ${left} ${left === 1 ? "attempt" : "attempts"} left.` : "Too many wrong attempts. Please request a new code." };
  }

  // Marking it used in one statement means two requests can't both sign in with the same code.
  const used = await rows<{ id: number }>(sql`UPDATE otp_codes SET is_used = 1, verified_at = LOCALTIMESTAMP WHERE id = ${otp.id} AND is_used = 0 RETURNING id`);
  if (!used.length) return { ok: false, message: "This code has already been used. Please request a new one." };

  const customerId = await findOrCreateCustomer(email);
  if (!customerId) return { ok: false, message: "This account is not active. Please contact support." };
  await setCustomerSession(customerId);
  await mergeGuestCart(customerId);

  const [row] = await rows<{ first_name: string; last_name: string; phone: string | null }>(sql`SELECT first_name, last_name, phone FROM customers WHERE id = ${customerId}`);
  return { ok: true, needsProfile: needsProfile({ ...row, id: customerId, email, gender: null, date_of_birth: null }) };
}

export async function completeProfile(rawName: string, rawPhone: string): Promise<AuthResult> {
  const customer = await getCustomer();
  if (!customer) return { ok: false, message: "Please sign in again." };
  const name = String(rawName ?? "").trim().replace(/\s+/g, " ");
  const phone = String(rawPhone ?? "").replace(/\D/g, "");
  if (name.length < 2 || name.length > 200) return { ok: false, message: "Please enter your full name." };
  if (!/^[6-9]\d{9}$/.test(phone)) return { ok: false, message: "Please enter a valid 10-digit mobile number." };

  const [first, ...rest] = name.split(" ");
  try {
    await sql`UPDATE customers SET first_name = ${first.slice(0, 100)}, last_name = ${rest.join(" ").slice(0, 100)}, phone = ${phone} WHERE id = ${customer.id}`;
  } catch (err) {
    if ((err as { code?: string }).code === "23505") return { ok: false, message: "This phone number is already registered with another account." };
    console.error("[completeProfile]", err);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
  return { ok: true };
}

export async function logout() {
  await clearCustomerSession();
}
