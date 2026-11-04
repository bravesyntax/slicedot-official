import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { rows, sql } from "@/lib/db";
import { passwordFingerprint, SESSION_COOKIE, verifySession } from "./session";

export type AdminUser = { id: number; username: string };

/** Signed-in admin, or null. Checks the cookie signature and that the account is still active with the same password. */
export async function getAdmin(): Promise<AdminUser | null> {
  const p = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!p) return null;
  const [user] = await rows<{ id: number; username: string; password: string }>(sql`
    SELECT id, username, password FROM admin_users WHERE id = ${p.uid} AND status = 'active' LIMIT 1
  `);
  if (!user || (await passwordFingerprint(user.password)) !== p.pv) return null;
  return { id: user.id, username: user.username };
}

/** For admin pages and server actions: the signed-in admin, or a redirect to the login page. */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
