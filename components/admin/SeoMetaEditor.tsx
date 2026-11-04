"use client";

import { AlertTriangle, CheckCircle2, Circle, Code2, Globe, Image as ImageIcon, Link2, Search, Share2, Target } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { SubmitButton } from "./client";
import { inputCls, labelCls, primaryBtn } from "./styles";

// Editor for one URL's SEO (Admin → SEO → edit). Empty fields fall back to the defaults shown as
// placeholders, so an admin only fills in what they want to change. Previews and checks update live.

export type SeoEditorValues = {
  title: string;
  description: string;
  focus_keyword: string;
  og_image: string;
  canonical_url: string;
  noindex: boolean;
  schema_json: string;
};

type Props = {
  entityType: string;
  entityKey: string;
  values: SeoEditorValues;
  defaults: { title: string; description: string; image: string; canonical: string };
  url: string;
  siteName: string;
  /** Titles and descriptions of every other indexable URL (lower-cased), for the uniqueness check. */
  otherTitles: string[];
  otherDescriptions: string[];
  forcedNoindex: string | null;
  titleRange: [number, number];
  descriptionRange: [number, number];
  action: (fd: FormData) => void;
};

type Check = { ok: boolean | null; text: string };

function Counter({ value, range }: { value: number; range: [number, number] }) {
  const [min, max] = range;
  const tone = value === 0 ? "bg-muted" : value < min ? "bg-amber-400" : value > max ? "bg-red-400" : "bg-emerald-400";
  const text = value === 0 ? "text-muted-foreground" : value < min ? "text-amber-700 dark:text-amber-400" : value > max ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400";
  return (
    <div className="mt-1.5 flex items-center gap-3">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </div>
      <span className={`font-mono text-[11px] ${text}`}>
        {value} / {min}–{max}
      </span>
    </div>
  );
}

function Panel({ icon: Icon, title, children, aside }: { icon: typeof Search; title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export default function SeoMetaEditor(p: Props) {
  const [v, setV] = useState(p.values);
  const set = <K extends keyof SeoEditorValues>(k: K, val: SeoEditorValues[K]) => setV((x) => ({ ...x, [k]: val }));

  const title = v.title.trim() || p.defaults.title;
  const description = v.description.trim() || p.defaults.description;
  const image = v.og_image.trim() || p.defaults.image;
  const canonical = v.canonical_url.trim() || p.defaults.canonical;
  const kw = v.focus_keyword.trim().toLowerCase();

  const schemaError = useMemo(() => {
    if (!v.schema_json.trim()) return null;
    try {
      const parsed = JSON.parse(v.schema_json);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      return list.length && list.every((x) => x && typeof x === "object" && !Array.isArray(x)) ? null : "Must be an object or an array of objects.";
    } catch (err) {
      return err instanceof Error ? err.message : "Invalid JSON";
    }
  }, [v.schema_json]);

  const noindex = v.noindex || !!p.forcedNoindex;
  const checks: Check[] = [
    { ok: title.length >= p.titleRange[0] && title.length <= p.titleRange[1], text: `Title is ${p.titleRange[0]}–${p.titleRange[1]} characters (${title.length})` },
    { ok: description.length >= p.descriptionRange[0] && description.length <= p.descriptionRange[1], text: `Description is ${p.descriptionRange[0]}–${p.descriptionRange[1]} characters (${description.length})` },
    { ok: !p.otherTitles.includes(title.toLowerCase()), text: "Title is unique across the site" },
    { ok: !p.otherDescriptions.includes(description.toLowerCase()), text: "Description is unique across the site" },
    { ok: kw ? title.toLowerCase().includes(kw) : null, text: "Focus keyword appears in the title" },
    { ok: kw ? description.toLowerCase().includes(kw) : null, text: "Focus keyword appears in the description" },
    { ok: kw ? p.url.toLowerCase().includes(kw.replace(/[^a-z0-9]+/g, "-")) : null, text: "Focus keyword appears in the URL" },
    { ok: kw ? title.toLowerCase().indexOf(kw) <= title.length / 2 : null, text: "Focus keyword is near the start of the title" },
    { ok: !!image, text: "Has a social share image" },
    { ok: !noindex, text: "Visible to search engines" },
  ];
  const passed = checks.filter((c) => c.ok === true).length;
  const scored = checks.filter((c) => c.ok !== null).length;
  const score = scored ? Math.round((passed / scored) * 100) : 0;
  const scoreTone = score >= 80 ? "text-emerald-700 dark:text-emerald-400" : score >= 50 ? "text-amber-700 dark:text-amber-400" : "text-red-700 dark:text-red-400";

  let host = "";
  let crumbs = "";
  try {
    const u = new URL(canonical);
    host = u.host;
    crumbs = u.pathname.split("/").filter(Boolean).map(decodeURIComponent).join(" › ");
  } catch {
    host = canonical;
  }

  return (
    <form action={p.action} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <input type="hidden" name="entity_type" value={p.entityType} />
      <input type="hidden" name="entity_key" value={p.entityKey} />

      <div className="min-w-0 space-y-6">
        <Panel icon={Search} title="Search appearance">
          <div className="space-y-5">
            <div>
              <label htmlFor="seo-title" className={labelCls}>
                SEO title
              </label>
              <input id="seo-title" name="title" maxLength={200} value={v.title} onChange={(e) => set("title", e.target.value)} placeholder={p.defaults.title} className={inputCls} />
              <Counter value={title.length} range={p.titleRange} />
              {!v.title.trim() && <p className="mt-1 text-[11px] text-muted-foreground">Using the default shown above. Type to override it.</p>}
            </div>
            <div>
              <label htmlFor="seo-desc" className={labelCls}>
                Meta description
              </label>
              <textarea
                id="seo-desc"
                name="description"
                rows={3}
                maxLength={400}
                value={v.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder={p.defaults.description}
                className={`${inputCls} resize-y`}
              />
              <Counter value={description.length} range={p.descriptionRange} />
            </div>
            <div>
              <label htmlFor="seo-kw" className={labelCls}>
                Focus keyword <span className="text-muted-foreground">(used for the checks, not shown on the page)</span>
              </label>
              <div className="relative">
                <Target className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input id="seo-kw" name="focus_keyword" maxLength={100} value={v.focus_keyword} onChange={(e) => set("focus_keyword", e.target.value)} placeholder="e.g. silver earrings for women" className={`${inputCls} pl-9`} />
              </div>
            </div>
          </div>
        </Panel>

        <Panel icon={Share2} title="Social sharing">
          <label htmlFor="seo-img" className={labelCls}>
            Share image URL <span className="text-muted-foreground">(1200×630 recommended)</span>
          </label>
          <div className="relative">
            <ImageIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input id="seo-img" name="og_image" value={v.og_image} onChange={(e) => set("og_image", e.target.value)} placeholder={p.defaults.image || "https://… or /images/…"} className={`${inputCls} pl-9`} />
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">Shown when the link is shared on WhatsApp, LinkedIn, X or Facebook.</p>
        </Panel>

        <Panel icon={Globe} title="Indexing">
          <div className="space-y-5">
            <div>
              <label htmlFor="seo-canonical" className={labelCls}>
                Canonical URL <span className="text-muted-foreground">(only if another URL is the main version of this page)</span>
              </label>
              <div className="relative">
                <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input id="seo-canonical" name="canonical_url" value={v.canonical_url} onChange={(e) => set("canonical_url", e.target.value)} placeholder={p.defaults.canonical} className={`${inputCls} pl-9`} />
              </div>
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/40 p-4">
              <input type="checkbox" name="noindex" value="1" checked={v.noindex} onChange={(e) => set("noindex", e.target.checked)} className="mt-0.5 h-4 w-4 accent-red-500" />
              <span>
                <span className="block text-sm font-medium text-foreground">Hide from search engines (noindex)</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">Google drops the page from results and it is removed from the sitemap. Links on it are still followed.</span>
              </span>
            </label>
            {p.forcedNoindex && (
              <p className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                This URL is kept out of search by the site itself ({p.forcedNoindex}), whatever you set here.
              </p>
            )}
          </div>
        </Panel>

        <Panel icon={Code2} title="Custom structured data" aside={schemaError ? <span className="text-[11px] text-red-700 dark:text-red-400">Invalid JSON</span> : v.schema_json.trim() ? <span className="text-[11px] text-emerald-700 dark:text-emerald-400">Valid JSON</span> : null}>
          <textarea
            name="schema_json"
            rows={8}
            spellCheck={false}
            value={v.schema_json}
            onChange={(e) => set("schema_json", e.target.value)}
            placeholder={'{\n  "@context": "https://schema.org",\n  "@type": "FAQPage",\n  "mainEntity": []\n}'}
            aria-label="Custom JSON-LD"
            className={`${inputCls} resize-y text-xs leading-relaxed`}
          />
          <p className={`mt-1.5 text-[11px] ${schemaError ? "text-red-700 dark:text-red-400" : "text-muted-foreground"}`}>
            {schemaError ?? "Optional JSON-LD (FAQ, Offer…). Added alongside the schema the site generates."}
          </p>
        </Panel>

        <div className="flex items-center gap-3">
          <SubmitButton className={`${primaryBtn} ${schemaError ? "pointer-events-none opacity-50" : ""}`}>Save SEO</SubmitButton>
          <span className="text-xs text-muted-foreground">Leave a field empty to use its default.</span>
        </div>
      </div>

      <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">SEO checks</h3>
            <span className={`font-display text-2xl font-bold ${scoreTone}`}>{score}</span>
          </div>
          <ul className="mt-4 space-y-2.5">
            {checks.map((c) => (
              <li key={c.text} className="flex items-start gap-2 text-xs">
                {c.ok === true ? (
                  <CheckCircle2 className="mt-px h-4 w-4 flex-shrink-0 text-emerald-700 dark:text-emerald-400" aria-label="Pass" />
                ) : c.ok === false ? (
                  <AlertTriangle className="mt-px h-4 w-4 flex-shrink-0 text-amber-700 dark:text-amber-400" aria-label="Needs work" />
                ) : (
                  <Circle className="mt-px h-4 w-4 flex-shrink-0 text-muted-foreground" aria-label="Set a focus keyword" />
                )}
                <span className={c.ok === null ? "text-muted-foreground" : "text-foreground"}>{c.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Google preview</h3>
          <div className="rounded-xl bg-white p-4 font-[arial,sans-serif]">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-bold text-zinc-700">{p.siteName.slice(0, 1)}</span>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-[13px] text-[#202124]">{p.siteName}</div>
                <div className="truncate text-[11px] text-[#4d5156]">
                  {host}
                  {crumbs && ` › ${crumbs}`}
                </div>
              </div>
            </div>
            <div className="mt-2 text-[18px] leading-snug text-[#1a0dab]">{cut(title, 60)}</div>
            <div className="mt-1 text-[13px] leading-snug text-[#4d5156]">{cut(description, 160)}</div>
          </div>
          {noindex && <p className="mt-2 text-[11px] text-red-700 dark:text-red-400">Not shown in Google while noindex is on.</p>}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Social preview</h3>
          <div className="overflow-hidden rounded-xl border border-border bg-background">
            <div className="flex aspect-[1200/630] items-center justify-center bg-muted">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element -- arbitrary admin-entered URL, preview only
                <img src={image} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ImageIcon className="h-4 w-4" aria-hidden="true" /> No image
                </span>
              )}
            </div>
            <div className="space-y-1 p-3">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{host}</div>
              <div className="line-clamp-2 text-sm font-semibold text-foreground">{title}</div>
              <div className="line-clamp-2 text-xs text-muted-foreground">{description}</div>
            </div>
          </div>
        </section>
      </aside>
    </form>
  );
}
