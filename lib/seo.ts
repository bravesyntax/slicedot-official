import "server-only";
import type { Metadata } from "next";
import { cache } from "react";
import { SITE_LIVE, SITE_NAME, SITE_URL } from "./config";
import { rows, sql } from "./db";
import { categoryImage, categoryUrl, productImage, productUrl } from "./routes";
import { seoPageDef } from "./seo-pages";
import { getSeoSettings, type SeoSettings } from "./settings";

// SEO for every public URL. Resolution order for each field:
//   1. what an admin saved for that exact URL (seo_meta, Admin → SEO)
//   2. the URL's built-in default (page registry, the product's or category's own fields)
//   3. site-wide defaults (Admin → SEO → Settings)

export type SeoEntity = "page" | "product" | "category";

export type SeoRecord = {
  title: string | null;
  description: string | null;
  focus_keyword: string | null;
  og_image: string | null;
  canonical_url: string | null;
  noindex: number;
  schema_json: string | null;
  updated_at: Date | null;
};

/** The admin-saved SEO for one URL, or null. */
export const getSeoRecord = cache(async (type: SeoEntity, key: string): Promise<SeoRecord | null> => {
  const [record] = await rows<SeoRecord>(sql`
    SELECT title, description, focus_keyword, og_image, canonical_url, noindex, schema_json, updated_at
    FROM seo_meta WHERE entity_type = ${type} AND entity_key = ${key} LIMIT 1
  `);
  return record ?? null;
});

export type SeoDefaults = {
  /** Default title. With `suffix`, the site title suffix is appended (only to the default, never to a custom title). */
  title: string;
  suffix?: boolean;
  description?: string;
  /** Path of the URL, e.g. "/product/my-item". */
  path: string;
  image?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
};

export type ResolvedSeo = {
  title: string;
  description: string;
  canonical: string;
  image: string;
  noindex: boolean;
  focusKeyword: string;
  schemaJson: string | null;
};

const abs = (url: string) => (!url ? "" : /^https?:\/\//i.test(url) ? url : `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`);

/** Pure resolution of one URL's SEO from its saved record (if any), the site settings and its defaults. */
export function applySeo(rec: SeoRecord | null, settings: SeoSettings, d: SeoDefaults): ResolvedSeo {
  return {
    title: rec?.title?.trim() || (d.suffix ? `${d.title}${settings.titleSuffix}` : d.title),
    description: rec?.description?.trim() || d.description?.trim() || settings.defaultDescription,
    canonical: abs(rec?.canonical_url?.trim() || (d.path === "/" ? SITE_URL : `${SITE_URL}${d.path}`)),
    image: abs(rec?.og_image?.trim() || d.image || settings.defaultImage),
    noindex: !!rec?.noindex,
    focusKeyword: rec?.focus_keyword?.trim() ?? "",
    schemaJson: rec?.schema_json?.trim() || null,
  };
}

/** Next.js metadata for a URL. Nothing is indexable until the site goes live, whatever the admin sets. */
export async function buildMetadata(type: SeoEntity, key: string, d: SeoDefaults, opts: { forceNoindex?: boolean } = {}): Promise<Metadata> {
  const [record, settings] = await Promise.all([getSeoRecord(type, key), getSeoSettings()]);
  const seo = applySeo(record, settings, d);
  const index = SITE_LIVE && !seo.noindex && !opts.forceNoindex;
  const images = seo.image ? [seo.image] : undefined;
  const ogTitle = record?.title?.trim() ? seo.title : d.ogTitle || seo.title;
  const ogDescription = record?.description?.trim() ? seo.description : d.ogDescription || seo.description;
  return {
    title: { absolute: seo.title },
    description: seo.description,
    keywords: d.keywords || undefined,
    robots: { index, follow: SITE_LIVE, googleBot: { index, follow: SITE_LIVE, "max-image-preview": "large", "max-snippet": -1 } },
    alternates: { canonical: seo.canonical },
    openGraph: { type: "website", title: ogTitle, description: ogDescription, url: seo.canonical, siteName: settings.orgName, locale: "en_IN", images },
    twitter: { card: images ? "summary_large_image" : "summary", title: ogTitle, description: ogDescription, images },
  };
}

/** Shortens text to about 155 characters at a word boundary. */
export function clipDescription(text: string, max = 155) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:.\s]+$/, "")}…`;
}

export function pageDefaults(slug: string): SeoDefaults {
  const def = seoPageDef(slug);
  return { title: def?.title ?? SITE_NAME, suffix: slug !== "home", description: def?.description, path: def?.path ?? `/${slug}` };
}

/** Home takes its title, description and keywords from the site-wide settings. */
export async function homeDefaults(): Promise<SeoDefaults> {
  const seo = await getSeoSettings();
  const d = pageDefaults("home");
  return { ...d, title: seo.title || d.title, description: seo.description || d.description, keywords: seo.keywords };
}

export const pageMetadata = async (slug: string) => buildMetadata("page", slug, slug === "home" ? await homeDefaults() : pageDefaults(slug));

type ProductSeoFields = { slug: string; name: string; meta_title: string | null; meta_description: string | null; meta_keywords: string | null; description: string | null; short_description: string | null; og_title: string | null; og_description: string | null; og_image: string | null; image: string | null };

export function productSeoDefaults(p: ProductSeoFields): SeoDefaults {
  const image = p.og_image || p.image;
  return {
    title: p.meta_title || `${p.name} | Buy Online at ${SITE_NAME}`,
    description: p.meta_description || clipDescription(p.description ?? p.short_description ?? ""),
    path: productUrl(p.slug),
    image: image ? productImage(image) : "",
    keywords: p.meta_keywords || undefined,
    ogTitle: p.og_title || undefined,
    ogDescription: p.og_description || undefined,
  };
}

type CategorySeoFields = { slug: string; name: string; meta_title: string | null; meta_description: string | null; keywords: string | null; description: string | null; image: string | null };

export function categorySeoDefaults(c: CategorySeoFields): SeoDefaults {
  return {
    title: c.meta_title || c.name,
    suffix: true,
    description: c.meta_description || clipDescription(c.description ?? "") || `Shop ${c.name} at ${SITE_NAME}.`,
    path: categoryUrl(c.slug),
    image: c.image ? categoryImage(c.image) : "",
    keywords: c.keywords || undefined,
  };
}

/** Custom JSON-LD saved for a URL, parsed; [] if none. */
export async function customSchema(type: SeoEntity, key: string): Promise<object[]> {
  const record = await getSeoRecord(type, key);
  if (!record?.schema_json) return [];
  try {
    const value = JSON.parse(record.schema_json);
    return Array.isArray(value) ? value : [value];
  } catch {
    return []; // invalid JSON is rejected on save
  }
}

/** URLs that must stay out of the sitemap: set to noindex, or pointing at another URL as the main version. */
export async function sitemapExclusions() {
  const data = await rows<{ entity_type: SeoEntity; entity_key: string }>(sql`SELECT entity_type, entity_key FROM seo_meta WHERE noindex = 1 OR COALESCE(canonical_url, '') <> ''`);
  return new Set(data.map((r) => `${r.entity_type}:${r.entity_key}`));
}
