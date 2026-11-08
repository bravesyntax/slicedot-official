import "server-only";
import { SITE_URL } from "@/lib/config";
import { rows, sql } from "@/lib/db";
import { applySeo, categorySeoDefaults, homeDefaults, pageDefaults, productSeoDefaults, type ResolvedSeo, type SeoDefaults, type SeoEntity, type SeoRecord } from "@/lib/seo";
import { seoChecks } from "@/lib/seo-checks";
import { DESCRIPTION_RANGE, SEO_PAGES, TITLE_RANGE } from "@/lib/seo-pages";
import { getSeoSettings, type SeoSettings } from "@/lib/settings";

// Everything the admin SEO module shows: every public URL with its resolved SEO and the problems found.
// All URLs are resolved in memory from one read of seo_meta, so the overview stays a handful of queries.

export type IssueCode =
  | "title_short" | "title_long" | "title_duplicate"
  | "desc_short" | "desc_long" | "desc_duplicate"
  | "noindex" | "no_image" | "keyword_missing" | "keyword_unset" | "canonical_elsewhere"
  | "keyword_not_in_desc" | "keyword_not_in_url" | "keyword_late";

export type Severity = "error" | "warning" | "notice";

export const ISSUES: Record<IssueCode, { severity: Severity; label: string; help: string }> = {
  title_duplicate: { severity: "error", label: "Duplicate title", help: "Two URLs share a title, so Google has to guess which one to rank." },
  desc_duplicate: { severity: "error", label: "Duplicate description", help: "Several URLs share a meta description. Each page needs its own." },
  noindex: { severity: "error", label: "Hidden from search (noindex)", help: "Set to noindex in the SEO editor; this URL won't appear in Google." },
  title_long: { severity: "warning", label: "Title too long", help: `Over ${TITLE_RANGE[1]} characters; Google will cut it off in results.` },
  title_short: { severity: "warning", label: "Title too short", help: `Under ${TITLE_RANGE[0]} characters; there's room for a keyword or benefit.` },
  desc_long: { severity: "warning", label: "Description too long", help: `Over ${DESCRIPTION_RANGE[1]} characters; it will be truncated.` },
  desc_short: { severity: "warning", label: "Description too short", help: `Under ${DESCRIPTION_RANGE[0]} characters; Google may write its own snippet.` },
  keyword_missing: { severity: "warning", label: "Focus keyword not in title", help: "The focus keyword you set doesn't appear in the title." },
  keyword_not_in_desc: { severity: "warning", label: "Focus keyword not in description", help: "The focus keyword you set doesn't appear in the meta description." },
  keyword_not_in_url: { severity: "notice", label: "Focus keyword not in URL", help: "Pick a focus keyword made of words in the page's URL." },
  keyword_late: { severity: "notice", label: "Focus keyword late in title", help: "Move the focus keyword towards the start of the title." },
  no_image: { severity: "notice", label: "No social image", help: "Links shared on WhatsApp, Instagram or X show no preview image." },
  keyword_unset: { severity: "notice", label: "No focus keyword", help: "Set a focus keyword so the editor can check your title and description against it." },
  canonical_elsewhere: { severity: "notice", label: "Canonical points elsewhere", help: "This URL tells Google another URL is the main version, so it's left out of the sitemap." },
};

const WEIGHT: Record<Severity, number> = { error: 10, warning: 4, notice: 1 };

export type SeoTarget = {
  type: SeoEntity;
  key: string;
  label: string;
  /** Secondary text in lists: path, category… */
  meta: string;
  path: string;
  defaults: SeoDefaults;
  record: SeoRecord | null;
  seo: ResolvedSeo;
  /** Kept out of search by the site itself (inactive products, empty categories). */
  forcedNoindex: string | null;
  issues: IssueCode[];
  /** The same 0–100 score the SEO editor shows for this URL. */
  score: number;
};

export const TYPE_LABEL: Record<SeoEntity, string> = { page: "Page", product: "Product", category: "Category" };
export const TYPE_PLURAL: Record<SeoEntity, string> = { page: "Pages", product: "Products", category: "Categories" };
export const TYPE_ROUTE: Record<SeoEntity, "pages" | "products" | "categories"> = { page: "pages", product: "products", category: "categories" };

export const editHref = (type: SeoEntity, key: string) => `/admin/seo/edit?type=${type}&key=${encodeURIComponent(key)}`;

async function loadRaw() {
  const [records, settings, home, products, categories] = await Promise.all([
    rows<SeoRecord & { entity_type: SeoEntity; entity_key: string }>(sql`
      SELECT entity_type, entity_key, title, description, focus_keyword, og_image, canonical_url, noindex, schema_json, updated_at FROM seo_meta
    `),
    getSeoSettings(),
    homeDefaults(),
    rows<Parameters<typeof productSeoDefaults>[0] & { id: number; status: string; category: string | null }>(sql`
      SELECT p.id, p.name, p.slug, p.status, p.image, p.meta_title, p.meta_description, p.meta_keywords, p.description, p.short_description, p.og_title, p.og_description, p.og_image, c.name AS category
      FROM products p LEFT JOIN categories c ON c.id = p.category_id ORDER BY p.id DESC
    `),
    rows<Parameters<typeof categorySeoDefaults>[0] & { id: number; status: string; products: number }>(sql`
      SELECT c.id, c.name, c.slug, c.status, c.image, c.meta_title, c.meta_description, c.keywords, c.description,
        (SELECT COUNT(*)::int FROM products p WHERE p.category_id = c.id AND p.status = 'active') AS products
      FROM categories c ORDER BY c.sort_order, c.name
    `),
  ]);
  return { records, settings, home, products, categories };
}

const ownUrl = (path: string) => (path === "/" ? SITE_URL : `${SITE_URL}${path}`).replace(/\/$/, "");

function build(raw: Awaited<ReturnType<typeof loadRaw>>): SeoTarget[] {
  const recordOf = new Map(raw.records.map((r) => [`${r.entity_type}:${r.entity_key}`, r]));
  const out: SeoTarget[] = [];
  const push = (type: SeoEntity, key: string, label: string, meta: string, defaults: SeoDefaults, forcedNoindex: string | null = null) => {
    const record = recordOf.get(`${type}:${key}`) ?? null;
    out.push({ type, key, label, meta, path: defaults.path, defaults, record, seo: applySeo(record, raw.settings, defaults), forcedNoindex, issues: [], score: 0 });
  };

  for (const p of SEO_PAGES) push("page", p.slug, p.label, p.path, p.slug === "home" ? raw.home : pageDefaults(p.slug));
  // Keyed by id, so renaming a product or category keeps its SEO.
  for (const p of raw.products) push("product", String(p.id), p.name, p.category ?? "", productSeoDefaults(p), p.status === "active" ? null : "Inactive");
  for (const c of raw.categories) push("category", String(c.id), c.name, `${c.products} products`, categorySeoDefaults(c), c.status !== "active" ? "Inactive" : null);

  // Issues. Only URLs that can be indexed take part in the duplicate checks.
  const live = out.filter((t) => !t.forcedNoindex && !t.seo.noindex);
  const count = (pick: (t: SeoTarget) => string) => {
    const m = new Map<string, number>();
    live.forEach((t) => m.set(pick(t).toLowerCase(), (m.get(pick(t).toLowerCase()) ?? 0) + 1));
    return m;
  };
  const titles = count((t) => t.seo.title);
  const descs = count((t) => t.seo.description);

  const liveTitles = live.map((t) => t.seo.title.toLowerCase());
  const liveDescs = live.map((t) => t.seo.description.toLowerCase());
  for (const t of out) {
    const self = live.indexOf(t);
    const { checks, score } = seoChecks({
      title: t.seo.title, description: t.seo.description, focusKeyword: t.seo.focusKeyword, path: t.path, image: t.seo.image, noindex: t.seo.noindex,
      otherTitles: liveTitles.filter((_, n) => n !== self), otherDescriptions: liveDescs.filter((_, n) => n !== self),
    });
    t.score = score;
    if (t.forcedNoindex) continue;
    const failed = (id: string) => checks.some((c) => c.id === id && c.ok === false);
    if (failed("kw_desc")) t.issues.push("keyword_not_in_desc");
    if (failed("kw_url")) t.issues.push("keyword_not_in_url");
    if (failed("kw_start") && !failed("kw_title")) t.issues.push("keyword_late");
    const { title, description, noindex, image, focusKeyword, canonical } = t.seo;
    const i = t.issues;
    if (noindex) i.push("noindex");
    if (title.length > TITLE_RANGE[1]) i.push("title_long");
    else if (title.length < TITLE_RANGE[0]) i.push("title_short");
    if (description.length > DESCRIPTION_RANGE[1]) i.push("desc_long");
    else if (description.length < DESCRIPTION_RANGE[0]) i.push("desc_short");
    if (!noindex && (titles.get(title.toLowerCase()) ?? 0) > 1) i.push("title_duplicate");
    if (!noindex && (descs.get(description.toLowerCase()) ?? 0) > 1) i.push("desc_duplicate");
    if (!image) i.push("no_image");
    if (focusKeyword && !title.toLowerCase().includes(focusKeyword.toLowerCase())) i.push("keyword_missing");
    if (!focusKeyword) i.push("keyword_unset");
    if (canonical.replace(/\/$/, "") !== ownUrl(t.path)) i.push("canonical_elsewhere");
  }
  return out;
}

export async function loadSeoTargets(type?: SeoEntity): Promise<{ targets: SeoTarget[]; settings: SeoSettings }> {
  const raw = await loadRaw();
  const all = build(raw);
  return { targets: type ? all.filter((t) => t.type === type) : all, settings: raw.settings };
}

/** Everything about one URL for the editor (duplicate checks still see the whole site). */
export async function loadSeoTarget(type: SeoEntity, key: string) {
  const { targets, settings } = await loadSeoTargets();
  const target = targets.find((t) => t.type === type && t.key === key) ?? null;
  return { target, settings, all: targets };
}

/** 0–100 health score: 100 minus the weighted share of issues across indexable URLs. */
export function healthScore(targets: SeoTarget[]) {
  const checked = targets.filter((t) => !t.forcedNoindex);
  if (!checked.length) return 100;
  const penalty = checked.reduce((sum, t) => sum + t.issues.reduce((s, c) => s + WEIGHT[ISSUES[c].severity], 0), 0);
  // A URL with one error per page averages ~10 penalty points; scale so that is a score around 50.
  return Math.max(0, Math.round(100 - (penalty / checked.length) * 5));
}

export function worstSeverity(issues: IssueCode[]): Severity | null {
  if (issues.some((c) => ISSUES[c].severity === "error")) return "error";
  if (issues.some((c) => ISSUES[c].severity === "warning")) return "warning";
  return issues.length ? "notice" : null;
}
