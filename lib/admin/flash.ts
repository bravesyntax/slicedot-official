import "server-only";
import { cookies } from "next/headers";

// One-shot status messages for the admin panel. An action sets
// the cookie and redirects; the next admin page shows the message and the browser clears the cookie.

export const FLASH_COOKIE = "sd_flash";
export type Flash = { type: "success" | "error"; message: string };

export async function setFlash(type: Flash["type"], message: string) {
  (await cookies()).set(FLASH_COOKIE, JSON.stringify({ type, message }), {
    path: "/admin",
    maxAge: 60,
    sameSite: "strict",
    httpOnly: false, // read and cleared by components/admin/FlashMessage.tsx
  });
}

export async function readFlash(): Promise<Flash | null> {
  const raw = (await cookies()).get(FLASH_COOKIE)?.value;
  if (!raw) return null;
  try {
    const f = JSON.parse(raw) as Flash;
    return f && typeof f.message === "string" ? f : null;
  } catch {
    return null;
  }
}
