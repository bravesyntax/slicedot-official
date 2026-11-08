"use client";

import { Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { aiProductCopy } from "@/app/admin/(panel)/ai-actions";
import { SEO_FILL, type SeoFill } from "./SeoBasicsPanel";
import { secondaryBtn } from "./styles";

// Fills the product form from the AI draft. The admin reads and edits it, and nothing is saved until they press Save.
const value = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null)?.value ?? "";
function fill(id: string, text: string) {
  const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
  if (el) el.value = text;
}

export default function AiProductWriter({ productId }: { productId: number | null }) {
  const [pending, start] = useTransition();
  const [status, setStatus] = useState("");

  const write = () =>
    start(async () => {
      setStatus("Writing…");
      const result = await aiProductCopy({
        productId,
        name: value("name"),
        slug: value("slug"),
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
      const seo: SeoFill = { title: result.data.meta_title, description: result.data.meta_description, focus_keyword: result.data.focus_keyword };
      window.dispatchEvent(new CustomEvent(SEO_FILL, { detail: seo }));
      setStatus(result.data.left.length ? `Done, SEO score ${result.data.score}. Still to fix: ${result.data.left.join(" ")}` : "Done, SEO score 100. Read the text and the SEO box below, then save.");
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
