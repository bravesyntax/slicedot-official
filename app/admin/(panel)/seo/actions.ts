"use server";

import { requireAdmin } from "@/lib/admin/auth";
import { checkbox, finish, idsField, intField, makeSlug, refreshPublicSite } from "@/lib/admin/common";
import { rows, sql } from "@/lib/db";
import { normalizePath } from "@/lib/redirects";
import type { SeoEntity } from "@/lib/seo";
import { field, isValidHttpUrl } from "@/lib/validation";

const TYPES: SeoEntity[] = ["page", "product", "category"];
const KEY_RE = /^[a-z0-9][a-z0-9/_-]{0,199}$/i;
const editUrl = (type: string, key: string) => `/admin/seo/edit?type=${type}&key=${encodeURIComponent(key)}`;

/** Accepts an absolute http(s) URL or a site path ("/images/x.png"). */
const isUrlOrPath = (v: string) => (v.startsWith("/") && !v.startsWith("//") && !/\s/.test(v)) || isValidHttpUrl(v);

/** Custom JSON-LD must parse and be an object or an array of objects. */
function checkSchema(raw: string): string | null {
  if (raw.length > 20000) return "Custom JSON-LD is too long (20,000 characters max).";
  try {
    const v = JSON.parse(raw);
    const list = Array.isArray(v) ? v : [v];
    if (!list.length || list.some((x) => !x || typeof x !== "object" || Array.isArray(x))) return "Custom JSON-LD must be an object or an array of objects.";
    return null;
  } catch (err) {
    return `Custom JSON-LD is not valid JSON: ${err instanceof Error ? err.message : "parse error"}.`;
  }
}

// ── Per-URL SEO (seo_meta) ───────────────────────────────────────────────────

export async function saveSeoMeta(fd: FormData) {
  await requireAdmin();
  const type = field(fd, "entity_type") as SeoEntity;
  const key = field(fd, "entity_key");
  if (!TYPES.includes(type) || !KEY_RE.test(key)) await finish("error", "Unknown URL.", "/admin/seo");
  const back = editUrl(type, key);

  const title = field(fd, "title").slice(0, 200) || null;
  const description = field(fd, "description").replace(/\s+/g, " ").slice(0, 400) || null;
  const focus = field(fd, "focus_keyword").slice(0, 100) || null;
  const image = field(fd, "og_image") || null;
  const canonical = field(fd, "canonical_url") || null;
  const noindex = checkbox(fd, "noindex");
  const schema = String(fd.get("schema_json") ?? "").trim() || null;

  if (image && !isUrlOrPath(image)) await finish("error", "Social image must be a full https:// link or a path starting with /.", back);
  if (canonical && !isUrlOrPath(canonical)) await finish("error", "Canonical URL must be a full https:// link or a path starting with /.", back);
  if (schema) {
    const err = checkSchema(schema);
    if (err) await finish("error", err, back);
  }

  if (!title && !description && !focus && !image && !canonical && !noindex && !schema) {
    await sql`DELETE FROM seo_meta WHERE entity_type = ${type} AND entity_key = ${key}`;
  } else {
    await sql`
      INSERT INTO seo_meta (entity_type, entity_key, title, description, focus_keyword, og_image, canonical_url, noindex, schema_json, updated_at)
      VALUES (${type}, ${key}, ${title}, ${description}, ${focus}, ${image}, ${canonical}, ${noindex}, ${schema}, LOCALTIMESTAMP)
      ON CONFLICT (entity_type, entity_key) DO UPDATE SET
        title = EXCLUDED.title, description = EXCLUDED.description, focus_keyword = EXCLUDED.focus_keyword, og_image = EXCLUDED.og_image,
        canonical_url = EXCLUDED.canonical_url, noindex = EXCLUDED.noindex, schema_json = EXCLUDED.schema_json, updated_at = LOCALTIMESTAMP
    `;
  }
  refreshPublicSite();
  await finish("success", "SEO saved. The live page is updated.", back);
}

/** Drops the saved SEO for a URL so it goes back to its defaults. */
export async function resetSeoMeta(fd: FormData) {
  await requireAdmin();
  const type = field(fd, "entity_type");
  const key = field(fd, "entity_key");
  await sql`DELETE FROM seo_meta WHERE entity_type = ${type} AND entity_key = ${key}`;
  refreshPublicSite();
  await finish("success", "Reset to the default title, description and settings.", editUrl(type, key));
}

// ── Redirects ────────────────────────────────────────────────────────────────

const REDIRECTS = "/admin/seo/redirects";
const BLOCKED_SOURCES = /^\/(admin|api|_next|maintenance)(\/|$)/;

export async function saveRedirect(fd: FormData) {
  await requireAdmin();
  const id = intField(fd, "id");
  const back = id ? `${REDIRECTS}?edit=${id}` : REDIRECTS;
  const raw = field(fd, "old_url");
  const wildcard = raw.endsWith("/*");
  const source = wildcard ? `${normalizePath(raw.slice(0, -2)) || ""}/*` : normalizePath(raw);
  const type = ["301", "302", "410"].includes(field(fd, "redirect_type")) ? field(fd, "redirect_type") : "301";
  let destination = field(fd, "new_url");
  const note = field(fd, "note").slice(0, 255) || null;
  const status = checkbox(fd, "is_active") ? "active" : "inactive";

  if (!source || source === "/*" || (!wildcard && raw.includes("*"))) await finish("error", 'Enter the old path, e.g. "/old-page" or "/old-section/*".', back);
  if (source === "/") await finish("error", "The home page can't be redirected.", back);
  if (BLOCKED_SOURCES.test(source)) await finish("error", "Admin, API and system paths can't be redirected.", back);

  if (type === "410") {
    destination = "";
  } else {
    if (!destination) await finish("error", "Enter where the old path should go.", back);
    if (destination.startsWith("/")) {
      const hasStar = destination.includes("*");
      if (hasStar && !wildcard) await finish("error", 'Only a wildcard source ("/old/*") can use * in the destination.', back);
      destination = hasStar ? destination : normalizePath(destination) || destination;
      if (!hasStar && destination === source) await finish("error", "A path can't redirect to itself.", back);
    } else if (!isValidHttpUrl(destination)) {
      await finish("error", "Destination must be a path on this site (/new-page) or a full https:// link.", back);
    }
    // A → B while B → A already exists would loop forever.
    const [loop] = await rows<{ id: number }>(sql`SELECT id FROM seo_redirects WHERE status = 'active' AND old_url = ${destination} AND new_url = ${source} AND id <> ${id}`);
    if (loop) await finish("error", "That would create a redirect loop with an existing rule.", back);
  }

  try {
    if (id) await sql`UPDATE seo_redirects SET old_url = ${source}, new_url = ${destination}, redirect_type = ${type}, note = ${note}, status = ${status}, updated_at = LOCALTIMESTAMP WHERE id = ${id}`;
    else await sql`INSERT INTO seo_redirects (old_url, new_url, redirect_type, note, status) VALUES (${source}, ${destination}, ${type}, ${note}, ${status})`;
  } catch (err) {
    const dup = err instanceof Error && /duplicate key/i.test(err.message);
    await finish("error", dup ? `There's already a rule for ${source}.` : "Couldn't save the redirect.", back);
  }
  await finish("success", `Redirect saved for ${source}. It goes live within a minute.`, REDIRECTS);
}

export async function toggleRedirect(fd: FormData) {
  await requireAdmin();
  await sql`UPDATE seo_redirects SET status = CASE WHEN status = 'active' THEN 'inactive' ELSE 'active' END WHERE id = ${intField(fd, "id")}`;
  await finish("success", "Redirect updated. The change applies within a minute.", REDIRECTS);
}

export async function deleteRedirect(fd: FormData) {
  await requireAdmin();
  await sql`DELETE FROM seo_redirects WHERE id = ${intField(fd, "id")}`;
  await finish("success", "Redirect deleted. The change applies within a minute.", REDIRECTS);
}

// ── Site-wide settings ───────────────────────────────────────────────────────

const SETTINGS = "/admin/seo/settings";
const ORG_TYPES = ["OnlineStore", "Store", "Organization"];

/** Accepts either the token or the whole <meta … content="token"> tag a search engine hands out. */
function verificationToken(raw: string) {
  const m = raw.match(/content\s*=\s*["']([^"']+)["']/i);
  return (m ? m[1] : raw).trim().replace(/[^A-Za-z0-9_\-=+/.]/g, "").slice(0, 200);
}

export async function saveSeoSettings(fd: FormData) {
  await requireAdmin();
  const v = (k: string, max = 500) => String(fd.get(k) ?? "").trim().slice(0, max);

  const image = v("default_og_image");
  const logo = v("organization_logo");
  if (image && !isUrlOrPath(image)) await finish("error", "Default social image must be a full https:// link or a path starting with /.", SETTINGS);
  if (logo && !isUrlOrPath(logo)) await finish("error", "Logo must be a full https:// link or a path starting with /.", SETTINGS);
  const ga = v("google_analytics_id", 40);
  const gtm = v("google_tag_manager_id", 40);
  if (ga && !/^[A-Z0-9-]+$/i.test(ga)) await finish("error", "Google Analytics ID looks wrong; it should look like G-XXXXXXX.", SETTINGS);
  if (gtm && !/^GTM-[A-Z0-9]+$/i.test(gtm)) await finish("error", "Tag Manager ID looks wrong; it should look like GTM-XXXXXX.", SETTINGS);

  const values: [string, string][] = [
    // Suffix keeps its leading space (" | SliceDot"); only trailing whitespace is trimmed.
    ["seo_title_suffix", String(fd.get("seo_title_suffix") ?? "").replace(/\s+$/, "").slice(0, 60)],
    ["site_meta_title", v("site_meta_title", 200)],
    ["site_meta_description", v("site_meta_description", 400)],
    ["site_keywords", v("site_keywords", 1000)],
    ["default_og_image", image],
    ["google_search_console", verificationToken(v("google_search_console"))],
    ["bing_webmaster", verificationToken(v("bing_webmaster"))],
    ["google_analytics_id", ga],
    ["google_tag_manager_id", gtm],
    ["organization_name", v("organization_name", 120)],
    ["organization_type", ORG_TYPES.includes(v("organization_type")) ? v("organization_type") : "OnlineStore"],
    ["organization_logo", logo],
    ["business_address", v("business_address", 255)],
    ["business_city", v("business_city", 100)],
    ["business_state", v("business_state", 100)],
    ["business_postal", v("business_postal", 20)],
    ["business_country", v("business_country", 100)],
  ];
  await sql`
    INSERT INTO seo_settings (setting_key, setting_value) SELECT * FROM unnest(${values.map(([k]) => k)}::text[], ${values.map(([, x]) => x)}::text[])
    ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = LOCALTIMESTAMP
  `;
  refreshPublicSite();
  await finish("success", "SEO settings saved. Every page is updated.", SETTINGS);
}

// ── Popular-search keywords (seo_tags, shown in the footer tag cloud) ────────

const KEYWORDS = "/admin/seo/keywords";

export async function addKeyword(fd: FormData) {
  await requireAdmin();
  const name = field(fd, "tag_name").slice(0, 255);
  const slug = makeSlug(name);
  if (!slug) await finish("error", "Enter a keyword.", KEYWORDS);
  const group = field(fd, "category_group").slice(0, 100) || null;
  const [row] = await rows<{ id: number }>(sql`
    INSERT INTO seo_tags (tag_name, tag_slug, category_group, is_global, status) VALUES (${name}, ${slug}, ${group}, 1, 'active')
    ON CONFLICT DO NOTHING RETURNING id
  `);
  refreshPublicSite();
  await finish(row ? "success" : "error", row ? `Added "${name}".` : `"${name}" already exists.`, KEYWORDS);
}

export async function updateKeywords(fd: FormData) {
  await requireAdmin();
  const ids = idsField(fd);
  const action = field(fd, "bulk_action");
  const back = field(fd, "return_to").startsWith(KEYWORDS) ? field(fd, "return_to") : KEYWORDS;
  if (!ids.length) await finish("error", "Tick at least one keyword.", back);
  if (action === "activate") await sql`UPDATE seo_tags SET status = 'active' WHERE id IN ${sql(ids)}`;
  else if (action === "deactivate") await sql`UPDATE seo_tags SET status = 'inactive' WHERE id IN ${sql(ids)}`;
  else if (action === "delete") {
    await sql.begin(async (tx) => {
      await tx`DELETE FROM product_seo_tags WHERE tag_id IN ${tx(ids)}`;
      await tx`DELETE FROM category_seo_tags WHERE tag_id IN ${tx(ids)}`;
      await tx`DELETE FROM page_seo_tags WHERE tag_id IN ${tx(ids)}`;
      await tx`DELETE FROM seo_tags WHERE id IN ${tx(ids)}`;
    });
  } else await finish("error", "Pick an action.", back);
  refreshPublicSite();
  await finish("success", `${ids.length} keyword${ids.length === 1 ? "" : "s"} updated.`, back);
}

// ── Trending searches ────────────────────────────────────────────────────────

const TRENDING = "/admin/seo/trending";

export async function saveTrending(fd: FormData) {
  await requireAdmin();
  const id = intField(fd, "id");
  const term = field(fd, "search_term").slice(0, 255);
  if (!term) await finish("error", "Enter a search term.", TRENDING);
  const text = field(fd, "display_text").slice(0, 255) || null;
  const sort = intField(fd, "sort_order");
  const featured = checkbox(fd, "is_featured");
  const status = checkbox(fd, "is_active") ? "active" : "inactive";
  try {
    if (id) await sql`UPDATE seo_trending_searches SET search_term = ${term}, display_text = ${text}, sort_order = ${sort}, is_featured = ${featured}, status = ${status} WHERE id = ${id}`;
    else await sql`INSERT INTO seo_trending_searches (search_term, display_text, sort_order, is_featured, status, is_manual) VALUES (${term}, ${text}, ${sort}, ${featured}, ${status}, 1)`;
  } catch {
    await finish("error", `"${term}" is already in the list.`, TRENDING);
  }
  refreshPublicSite();
  await finish("success", "Trending search saved.", TRENDING);
}

export async function deleteTrending(fd: FormData) {
  await requireAdmin();
  await sql`DELETE FROM seo_trending_searches WHERE id = ${intField(fd, "id")}`;
  refreshPublicSite();
  await finish("success", "Trending search deleted.", TRENDING);
}

// ── FAQ ──────────────────────────────────────────────────────────────────────

const FAQ = "/admin/seo/faq";

export async function saveFaq(fd: FormData) {
  await requireAdmin();
  const id = intField(fd, "id");
  const question = field(fd, "question");
  const answer = field(fd, "answer");
  if (!question || !answer) await finish("error", "Enter both the question and the answer.", id ? `${FAQ}?edit=${id}` : FAQ);
  const page = ["homepage", "all"].includes(field(fd, "page")) ? field(fd, "page") : "homepage";
  const sort = intField(fd, "sort_order");
  const status = checkbox(fd, "is_active") ? "active" : "inactive";
  if (id) await sql`UPDATE seo_faq SET question = ${question}, answer = ${answer}, page = ${page}, sort_order = ${sort}, status = ${status} WHERE id = ${id}`;
  else await sql`INSERT INTO seo_faq (question, answer, page, sort_order, status) VALUES (${question}, ${answer}, ${page}, ${sort}, ${status})`;
  refreshPublicSite();
  await finish("success", "FAQ saved.", FAQ);
}

export async function deleteFaq(fd: FormData) {
  await requireAdmin();
  await sql`DELETE FROM seo_faq WHERE id = ${intField(fd, "id")}`;
  refreshPublicSite();
  await finish("success", "FAQ deleted.", FAQ);
}
