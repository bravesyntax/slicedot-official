import "server-only";
import { createHash, createHmac } from "node:crypto";
import { sameHash } from "@/lib/auth/session";

// Admin session tokens: base64url(JSON payload) + "." + HMAC. Signed apart from customer sessions, so one can
// never pass as the other.
export const SESSION_COOKIE = "sd_admin";
/** Holds the pending second step (emailed code) between password check and full sign-in. */
export const OTP_COOKIE = "sd_admin_otp";
export const OTP_TTL_SECONDS = 10 * 60;
/** Sliding inactivity timeout. */
export const SESSION_TTL_SECONDS = 60 * 60;

export type SessionPayload = {
  typ: "session";
  uid: number;
  u: string; // username
  pv: string; // password-hash fingerprint: changes when the password changes, which ends other sessions
  exp: number; // unix seconds
};

/** Proof that the password step passed; only good for entering the emailed code. */
export type OtpTicket = {
  typ: "otp";
  uid: number;
  oid: number; // admin_login_otps.id
  exp: number;
};

function secret(): string | null {
  const s = process.env.SESSION_SECRET;
  return s && s.length >= 32 ? s : null;
}
export const sessionsConfigured = () => secret() !== null;

const hmac = (body: string) => createHmac("sha256", secret()!).update(`admin:${body}`).digest("base64url");

function sign(payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${hmac(body)}`;
}

export const signSession = async (p: Omit<SessionPayload, "exp" | "typ">) =>
  sign({ ...p, typ: "session", exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS } satisfies SessionPayload);

export const signOtpTicket = async (p: Omit<OtpTicket, "exp" | "typ">) =>
  sign({ ...p, typ: "otp", exp: Math.floor(Date.now() / 1000) + OTP_TTL_SECONDS } satisfies OtpTicket);

/** Returns the payload if the signature is valid and the token hasn't expired. */
function verify<T extends { exp: number }>(token: string | undefined): T | null {
  if (!token || !secret()) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig || !sameHash(hmac(body), sig)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as T;
    return typeof p.exp === "number" && p.exp > Date.now() / 1000 ? p : null;
  } catch {
    return null;
  }
}

/** A valid, unexpired session token (never an OTP ticket). */
export async function verifySession(token: string | undefined) {
  const p = verify<SessionPayload>(token);
  return p?.typ === "session" ? p : null;
}

export async function verifyOtpTicket(token: string | undefined) {
  const p = verify<OtpTicket>(token);
  return p?.typ === "otp" ? p : null;
}

/** Short fingerprint of a password hash (not reversible, and the hash itself never leaves the server). */
export const passwordFingerprint = async (hash: string) => createHash("sha256").update(`pv:${hash}`).digest("base64url").slice(0, 16);

/** HMAC-SHA256 hex of a value under the session secret (used for one-time codes). */
export const keyedHash = async (value: string) => createHmac("sha256", secret()!).update(`admin-otp:${value}`).digest("hex");

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};
