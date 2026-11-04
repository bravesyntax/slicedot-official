"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileDrop } from "@/components/velora/file-drop";
import { NoUploads, uploadImage, type Mode } from "./ImagePicker";

type Uploaded = { path: string; name: string; type: string; size: number };

export default function MediaUploader({ mode, onUploaded }: { mode: Mode; onUploaded: (values: Uploaded[]) => Promise<void> }) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function onFiles(files: File[]) {
    if (busy || !files.length) return;
    setBusy(true);
    setStatus(`Uploading ${files.length} file${files.length === 1 ? "" : "s"}…`);
    const done: Uploaded[] = [];
    const problems: string[] = [];
    for (const file of files) {
      try {
        done.push({ path: await uploadImage("products", mode, file), name: file.name, type: file.type, size: file.size });
      } catch (err) {
        problems.push(err instanceof Error ? err.message : "Upload failed.");
      }
    }
    if (done.length) await onUploaded(done);
    setStatus(problems.join(" "));
    setBusy(false);
    router.refresh();
  }

  if (!mode) return <NoUploads />;
  return (
    <>
      <FileDrop accept=".jpg,.jpeg,.png,.webp,.gif" onFiles={onFiles} />
      {status && <p className={`mt-2 text-xs ${status.endsWith("…") ? "text-muted-foreground" : "text-destructive"}`} role="status">{status}</p>}
    </>
  );
}
