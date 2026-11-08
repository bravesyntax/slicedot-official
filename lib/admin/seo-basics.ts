import "server-only";
import { sql } from "@/lib/db";
import type { SeoEntity } from "@/lib/seo";
import { loadSeoTargets } from "./seo-audit";

// The SEO title, description and focus keyword edited right on the product and category forms. The other SEO
// settings (share image, canonical, noindex, JSON-LD) stay in Admin → SEO and are left as they are here.

export type SeoBasicsProps = {
  values: { title: string; description: string; focus_keyword: string };
  defaults: { title: string; description: string };
  image: string;
  noindex: boolean;
  otherTitles: string[];
  otherDescriptions: string[];
};

/** What the SEO box on a product or category form needs. `key` is null for one that isn't saved yet. */
export async function loadSeoBasics(type: SeoEntity, key: string | null): Promise<SeoBasicsProps> {
  const { targets, settings } = await loadSeoTargets();
  const target = key ? targets.find((t) => t.type === type && t.key === key) : undefined;
  const others = targets.filter((t) => t !== target && !t.forcedNoindex && !t.seo.noindex);
  return {
    values: { title: target?.record?.title ?? "", description: target?.record?.description ?? "", focus_keyword: target?.record?.focus_keyword ?? "" },
    defaults: target
      ? { title: target.defaults.suffix ? `${target.defaults.title}${settings.titleSuffix}` : target.defaults.title, description: target.defaults.description?.trim() || settings.defaultDescription }
      : { title: "", description: settings.defaultDescription },
    image: target?.seo.image ?? settings.defaultImage,
    noindex: !!target?.seo.noindex,
    otherTitles: others.map((o) => o.seo.title.toLowerCase()),
    otherDescriptions: others.map((o) => o.seo.description.toLowerCase()),
  };
}

/** Saves the SEO box from a product or category form. Does nothing when the form had no SEO box. */
export async function saveSeoBasics(type: SeoEntity, key: string, fd: FormData) {
  if (!fd.has("seo_title")) return;
  const text = (name: string, max: number) => String(fd.get(name) ?? "").replace(/\s+/g, " ").trim().slice(0, max) || null;
  const title = text("seo_title", 200);
  const description = text("seo_description", 400);
  const focus = text("seo_focus_keyword", 100);
  if (!title && !description && !focus) {
    await sql`UPDATE seo_meta SET title = NULL, description = NULL, focus_keyword = NULL, updated_at = LOCALTIMESTAMP WHERE entity_type = ${type} AND entity_key = ${key}`;
    return;
  }
  await sql`
    INSERT INTO seo_meta (entity_type, entity_key, title, description, focus_keyword, updated_at)
    VALUES (${type}, ${key}, ${title}, ${description}, ${focus}, LOCALTIMESTAMP)
    ON CONFLICT (entity_type, entity_key) DO UPDATE SET
      title = EXCLUDED.title, description = EXCLUDED.description, focus_keyword = EXCLUDED.focus_keyword, updated_at = LOCALTIMESTAMP
  `;
}
