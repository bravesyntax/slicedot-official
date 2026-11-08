"use client";

import { Search, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import type { SeoBasicsProps } from "@/lib/admin/seo-basics";
import { seoChecks } from "@/lib/seo-checks";
import { DESCRIPTION_RANGE, TITLE_RANGE } from "@/lib/seo-pages";
import SeoChecksCard from "./SeoChecksCard";
import { inputCls, labelCls } from "./styles";

// SEO title, description and focus keyword on the product and category forms, with the same live checks as
// Admin → SEO. Saved with the form. "Write with AI" on the product form fills it through the SEO_FILL event.

export const SEO_FILL = "sd:seo-fill";
export type SeoFill = { title: string; description: string; focus_keyword: string };

type Suggest = () => Promise<{ ok: true; data: SeoFill & { score: number; left: string[] } } | { ok: false; message: string }>;

const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const inputValue = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value ?? "";

function Count({ value, range }: { value: number; range: readonly [number, number] }) {
  const tone = value === 0 ? "text-muted-foreground" : value < range[0] || value > range[1] ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400";
  return <span className={`font-mono text-[11px] ${tone}`}>{value} / {range[0]}–{range[1]}</span>;
}

export default function SeoBasicsPanel(p: SeoBasicsProps & { pathPrefix: string; slug: string; editHref?: string; suggest?: Suggest; compact?: boolean }) {
  const [v, setV] = useState(p.values);
  const [slug, setSlug] = useState(p.slug);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    // The URL follows the slug field, or the name while the slug is empty.
    const sync = () => setSlug(slugify(inputValue("slug") || inputValue("name")) || p.slug);
    const fill = (e: Event) => {
      setV((e as CustomEvent<SeoFill>).detail);
      setNote("Filled in by AI. Check it, then save.");
    };
    document.addEventListener("input", sync);
    window.addEventListener(SEO_FILL, fill);
    return () => {
      document.removeEventListener("input", sync);
      window.removeEventListener(SEO_FILL, fill);
    };
  }, [p.slug]);

  const title = v.title.trim() || p.defaults.title;
  const description = v.description.trim() || p.defaults.description;
  const { checks, score } = seoChecks({ title, description, focusKeyword: v.focus_keyword, path: `${p.pathPrefix}${slug}`, image: p.image, noindex: p.noindex, otherTitles: p.otherTitles, otherDescriptions: p.otherDescriptions });
  const set = (k: keyof SeoFill, value: string) => setV((x) => ({ ...x, [k]: value }));

  const suggest = () =>
    start(async () => {
      if (!p.suggest) return;
      setNote("Writing…");
      const result = await p.suggest();
      if (!result.ok) return setNote(result.message);
      setV({ title: result.data.title, description: result.data.description, focus_keyword: result.data.focus_keyword });
      setNote(result.data.left.length ? `Filled in. Still to fix: ${result.data.left.join(" ")}` : "Filled in. Check it, then save.");
    });

  return (
    <div className={p.compact ? "space-y-4" : "grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]"}>
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[11px] text-muted-foreground">{p.pathPrefix}{slug || "…"}</p>
          <div className="flex items-center gap-3">
            {p.suggest && (
              <button type="button" onClick={suggest} disabled={pending} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs hover:bg-muted">
                <Sparkles className="size-3.5" aria-hidden="true" /> {pending ? "Writing…" : "Suggest with AI"}
              </button>
            )}
            {p.editHref && (
              <Link href={p.editHref} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <Search className="size-3.5" aria-hidden="true" /> All SEO settings
              </Link>
            )}
          </div>
        </div>
        {note && <p className="text-xs text-muted-foreground" role="status">{note}</p>}
        <div>
          <div className="flex items-center justify-between"><label htmlFor="seo_title" className={labelCls}>SEO title</label><Count value={title.length} range={TITLE_RANGE} /></div>
          <input id="seo_title" name="seo_title" maxLength={200} value={v.title} onChange={(e) => set("title", e.target.value)} placeholder={p.defaults.title || "Uses the name until you write one"} className={inputCls} />
        </div>
        <div>
          <div className="flex items-center justify-between"><label htmlFor="seo_description" className={labelCls}>Meta description</label><Count value={description.length} range={DESCRIPTION_RANGE} /></div>
          <textarea id="seo_description" name="seo_description" rows={3} maxLength={400} value={v.description} onChange={(e) => set("description", e.target.value)} placeholder={p.defaults.description} className={`${inputCls} resize-y`} />
        </div>
        <div>
          <label htmlFor="seo_focus_keyword" className={labelCls}>Focus keyword</label>
          <div className="relative">
            <Target className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input id="seo_focus_keyword" name="seo_focus_keyword" maxLength={100} value={v.focus_keyword} onChange={(e) => set("focus_keyword", e.target.value)} placeholder="Words from the URL, e.g. claw clip" className={`${inputCls} pl-9`} />
          </div>
        </div>
      </div>
      <SeoChecksCard checks={checks} score={score} />
    </div>
  );
}
