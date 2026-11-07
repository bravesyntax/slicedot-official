"use client";

import { Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { aiProductCopy } from "@/app/admin/(panel)/ai-actions";
import { secondaryBtn } from "./styles";

// Fills the product form from the AI draft. The admin reads and edits it, and nothing is saved until they press Save.
const value = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null)?.value ?? "";
function fill(id: string, text: string) {
  const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
  if (el) el.value = text;
}

export default function AiProductWriter() {
  const [pending, start] = useTransition();
  const [status, setStatus] = useState("");

  const write = () =>
    start(async () => {
      setStatus("Writing…");
      const result = await aiProductCopy({
        name: value("name"),
        categoryId: Number(value("category_id")) || null,
        price: value("price"),
        colors: value("colors"),
        sizes: value("size"),
        material: value("material"),
        notes: [value("short_description"), value("description")].filter(Boolean).join("\n"),
      });
      if (!result.ok) return setStatus(result.message);
      fill("short_description", result.data.short_description);
      fill("description", result.data.description);
      const current = value("keywords").split(",").map((k) => k.trim()).filter(Boolean);
      fill("keywords", [...new Set([...current, ...result.data.keywords])].slice(0, 30).join(", "));
      setStatus(`Done. Check the text, then save. Suggested SEO title: "${result.data.meta_title}"`);
    });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={write} disabled={pending} className={secondaryBtn}>
        <Sparkles className="size-3.5" aria-hidden="true" /> {pending ? "Writing…" : "Write with AI"}
      </button>
      {status && <p className="text-xs text-muted-foreground" role="status">{status}</p>}
    </div>
  );
}
