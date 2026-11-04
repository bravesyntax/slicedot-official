import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { setFlash } from "./flash";

/** Flash a message and redirect back. */
export async function finish(type: "success" | "error", message: string, to: string): Promise<never> {
  await setFlash(type, message);
  redirect(to);
}

/** After content changes, drop cached public pages so edits show up immediately. */
export function refreshPublicSite() {
  revalidatePath("/", "layout");
  revalidatePath("/sitemap.xml"); // a route handler, not under the layout
}

export const intField = (fd: FormData, name: string, fallback = 0) => {
  const n = Number.parseInt(String(fd.get(name) ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
};
export const checkbox = (fd: FormData, name: string) => (fd.get(name) ? 1 : 0);
export const idsField = (fd: FormData) =>
  fd
    .getAll("ids")
    .map((v) => Number.parseInt(String(v), 10))
    .filter((n) => Number.isFinite(n) && n > 0);

/** Slug from a title. */
export const makeSlug = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");
