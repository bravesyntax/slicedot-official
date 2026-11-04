import "server-only";
import { randomBytes } from "node:crypto";
import { access, mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { del } from "@vercel/blob";

// Images uploaded in the admin go to one of two places:
//   blob  – Vercel Blob (when BLOB_READ_WRITE_TOKEN is set; required on Vercel, whose disk is read-only)
//   local – public/uploads/<kind>/ on this machine, for local work
// The database stores a Blob URL or a bare filename; lib/routes.ts turns either into a URL.

export type ImageKind = "products" | "categories";
export type UploadMode = "blob" | "local" | null;

export function uploadMode(): UploadMode {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "blob";
  return process.env.VERCEL ? null : "local";
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const PREFIX: Record<ImageKind, string> = { products: "product", categories: "category" };
/** Files this admin wrote and may delete. Files from the PHP site have a different pattern, so they are never removed. */
const LOCAL_NAME_RE = /^(product|category)_\d{9,11}_[a-f0-9]{12}\.(jpg|png|webp|gif)$/;

const isBlobUrl = (v: string) => /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(v);

/** Image type from the file's first bytes (the browser's MIME type and extension are not trusted). */
export function sniffImage(buf: Buffer): "jpg" | "png" | "webp" | "gif" | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (buf.toString("ascii", 0, 6) === "GIF87a" || buf.toString("ascii", 0, 6) === "GIF89a") return "gif";
  return null;
}

export async function saveLocalImage(kind: ImageKind, buf: Buffer, ext: string) {
  const name = `${PREFIX[kind]}_${Math.floor(Date.now() / 1000)}_${randomBytes(6).toString("hex")}.${ext}`;
  const dir = path.join(UPLOAD_DIR, kind);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buf, { flag: "wx" });
  return name;
}

/** Whether a value posted by a form is an image the admin really uploaded just now, or one already on this record. */
export async function isOwnUpload(kind: ImageKind, value: string, existing: (string | null)[] = []) {
  if (existing.includes(value)) return true;
  if (isBlobUrl(value)) return new URL(value).pathname.startsWith(`/${kind}/`);
  if (!LOCAL_NAME_RE.test(value) || !value.startsWith(`${PREFIX[kind]}_`)) return false;
  return access(path.join(UPLOAD_DIR, kind, value)).then(() => true, () => false);
}

/** Best-effort delete of an image this admin uploaded. Anything else is left alone. */
export async function deleteImage(kind: ImageKind, value: string | null) {
  if (!value) return;
  try {
    if (isBlobUrl(value)) {
      if (process.env.BLOB_READ_WRITE_TOKEN) await del(value);
    } else if (LOCAL_NAME_RE.test(value) && !process.env.VERCEL) {
      await unlink(path.join(UPLOAD_DIR, kind, value));
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") console.error("[deleteImage]", err);
  }
}
