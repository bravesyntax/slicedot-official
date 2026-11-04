"use client";

import { ArrowUp, Trash2 } from "lucide-react";
import { useState } from "react";
import { FileDrop } from "@/components/velora/file-drop";
import { categoryImage, productImage } from "@/lib/routes";
import { inputCls } from "./styles";

// Image field for products and categories. Each file uploads as soon as it's picked (to Vercel Blob, or locally to
// public/uploads/), and the form then submits the resulting list in one hidden JSON field. The first image is the main one.

export type PickedImage = { path: string; alt: string; color: string };
type Kind = "products" | "categories";
export type Mode = "blob" | "local" | null;

const MAX_BYTES = 5 * 1024 * 1024;

export async function uploadImage(kind: Kind, mode: Mode, file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) throw new Error(`${file.name}: only JPG, PNG, WebP or GIF.`);
  if (file.size > MAX_BYTES) throw new Error(`${file.name}: too large, max 5 MB.`);
  if (mode === "local") {
    const body = new FormData();
    body.append("kind", kind);
    body.append("file", file);
    const res = await fetch("/api/admin/upload-local", { method: "POST", body });
    const data = (await res.json().catch(() => ({}))) as { name?: string; error?: string };
    if (!res.ok || !data.name) throw new Error(data.error || "Upload failed.");
    return data.name;
  }
  const { upload } = await import("@vercel/blob/client");
  const ext = file.name.split(".").pop()?.toLowerCase().replace("jpeg", "jpg") ?? "jpg";
  const blob = await upload(`${kind}/${Date.now()}.${ext}`, file, { access: "public", handleUploadUrl: "/api/admin/upload" });
  return blob.url;
}

export const NoUploads = () => (
  <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
    Image uploads on Vercel need a Blob store (BLOB_READ_WRITE_TOKEN). Existing images stay as they are.
  </p>
);

export default function ImagePicker({ kind, mode, name, initial, multiple = false, details = false }: { kind: Kind; mode: Mode; name: string; initial: PickedImage[]; multiple?: boolean; details?: boolean }) {
  const [images, setImages] = useState(initial);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const url = kind === "products" ? productImage : categoryImage;

  async function onPick(files: File[]) {
    if (busy || !files.length) return;
    setBusy(true);
    setStatus("Uploading…");
    const problems: string[] = [];
    for (const file of multiple ? files : files.slice(0, 1)) {
      try {
        const path = await uploadImage(kind, mode, file);
        setImages((list) => (multiple ? [...list, { path, alt: "", color: "" }] : [{ path, alt: "", color: "" }]));
      } catch (err) {
        problems.push(err instanceof Error ? err.message : "Upload failed.");
      }
    }
    setStatus(problems.join(" "));
    setBusy(false);
  }

  const set = (i: number, patch: Partial<PickedImage>) => setImages((list) => list.map((img, n) => (n === i ? { ...img, ...patch } : img)));

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(images)} />
      {images.length > 0 && (
        <ul className={multiple ? "grid gap-3 sm:grid-cols-2" : "max-w-xs"}>
          {images.map((img, i) => (
            <li key={img.path} className="flex gap-3 rounded-lg border bg-background p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail, may be a just-uploaded local file */}
              <img src={url(img.path)} alt="" className="size-20 shrink-0 rounded-md bg-muted object-contain" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{multiple && i === 0 ? "Main image" : `Image ${i + 1}`}</span>
                  <span className="flex gap-1">
                    {multiple && i > 0 && (
                      <button type="button" title="Move up" aria-label="Move up" onClick={() => setImages((l) => [...l.slice(0, i - 1), l[i], l[i - 1], ...l.slice(i + 1)])} className="rounded p-1 hover:bg-muted"><ArrowUp className="size-3.5" aria-hidden="true" /></button>
                    )}
                    <button type="button" title="Remove" aria-label="Remove" onClick={() => setImages((l) => l.filter((_, n) => n !== i))} className="rounded p-1 text-destructive hover:bg-destructive/10"><Trash2 className="size-3.5" aria-hidden="true" /></button>
                  </span>
                </div>
                {details && (
                  <>
                    <input value={img.alt} onChange={(e) => set(i, { alt: e.target.value })} placeholder="Alt text" aria-label="Alt text" className={`${inputCls} py-1 text-xs`} />
                    <input value={img.color} onChange={(e) => set(i, { color: e.target.value })} placeholder="Colour shown (optional)" aria-label="Colour" className={`${inputCls} py-1 text-xs`} />
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {mode ? <FileDrop accept=".jpg,.jpeg,.png,.webp,.gif" multiple={multiple} onFiles={onPick} /> : <NoUploads />}
      {status && <p className={`text-xs ${status.endsWith("…") ? "text-muted-foreground" : "text-destructive"}`} role="status">{status}</p>}
    </div>
  );
}
