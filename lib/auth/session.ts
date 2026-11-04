import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { rows, sql } from "@/lib/db";

// Customer sign-in: a signed httpOnly cookie holding the customer id and expiry. The account is re-read from the
// database on every use, so a banned or deleted customer loses access at once.
const COOKIE = "sd_customer";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET is not set");
  return s;
}

/** Keyed hash for values kept at rest, such as OTP codes. */
export const keyedHash = (value: string) => createHmac("sha256", secret()).update(value).digest("hex");

export const sameHash = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

const sign = (body: string) => createHmac("sha256", secret()).update(`session:${body}`).digest("base64url");

function readToken(token: string | undefined): number | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature || !sameHash(sign(body), signature)) return null;
  const [id, exp] = body.split("-").map(Number);
  return id > 0 && exp > Date.now() / 1000 ? id : null;
}

export async function setCustomerSession(customerId: number) {
  const body = `${customerId}-${Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS}`;
  (await cookies()).set(COOKIE, `${body}.${sign(body)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearCustomerSession() {
  (await cookies()).delete(COOKIE);
}

export type Customer = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  gender: string | null;
  date_of_birth: string | null;
};

export const getCustomer = cache(async (): Promise<Customer | null> => {
  const id = readToken((await cookies()).get(COOKIE)?.value);
  if (!id) return null;
  const [customer] = await rows<Customer>(sql`
    SELECT id, first_name, last_name, email, phone, gender, to_char(date_of_birth, 'YYYY-MM-DD') AS date_of_birth
    FROM customers WHERE id = ${id} AND status = 'active'
  `);
  return customer ?? null;
});

/** For pages and actions that need a signed-in customer; sends visitors to sign in and back again. */
export async function requireCustomer(returnTo: string): Promise<Customer> {
  const customer = await getCustomer();
  if (!customer) redirect(`/auth?redirect=${encodeURIComponent(returnTo)}`);
  return customer;
}

/** Only paths on this site: "//evil.com" and "/\evil.com" are other sites to a browser. */
export function safeReturnPath(path: string | null | undefined, fallback = "/account") {
  return path && /^\/(?![/\\])/.test(path) && !path.startsWith("/auth") ? path : fallback;
}

export const fullName = (c: Pick<Customer, "first_name" | "last_name">) => {
  const name = `${c.first_name} ${c.last_name}`.trim();
  return name.toLowerCase() === "user" ? "" : name;
};

export const needsProfile = (c: Customer) => !fullName(c) || !c.phone;

/** The account for a verified email, created on first sign-in. Null if it has been banned or deactivated. */
export async function findOrCreateCustomer(email: string, extra: { firstName?: string; lastName?: string; googleId?: string } = {}) {
  const address = email.trim().toLowerCase();
  await sql`
    INSERT INTO customers (first_name, last_name, email, google_id)
    SELECT ${extra.firstName ?? ""}::text, ${extra.lastName ?? ""}::text, ${address}::text, ${extra.googleId ?? null}::text
    WHERE NOT EXISTS (SELECT 1 FROM customers WHERE lower(email) = ${address}::text)
    ON CONFLICT DO NOTHING
  `;
  const [customer] = await rows<{ id: number; status: string }>(sql`
    UPDATE customers SET last_login = LOCALTIMESTAMP, google_id = COALESCE(${extra.googleId ?? null}::text, google_id)
    WHERE lower(email) = ${address} RETURNING id, status
  `);
  return customer && customer.status === "active" ? customer.id : null;
}
