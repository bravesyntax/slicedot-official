import "server-only";
import { rows, sql } from "./db";
import { categoryUrl, toRoute } from "./routes";

export type NavLink = { id: number; title: string; url: string | null };
export type NavSection = NavLink & { items: NavLink[] };
export type NavItem = NavLink & { sections: NavSection[] };

type Row = { id: number; parent_id: number | null; title: string; slug: string; url: string | null; category_id: number | null; menu_type: string };

/** Main menu → mega menu sections → links, from navigation_items. */
export async function getNavigation(): Promise<NavItem[]> {
  const [all, categories] = await Promise.all([
    rows<Row>(sql`SELECT id, parent_id, title, slug, url, category_id, menu_type FROM navigation_items WHERE status = 'active' ORDER BY sort_order ASC, id ASC`),
    rows<{ id: number; slug: string }>(sql`SELECT id, slug FROM categories WHERE status = 'active'`),
  ]);
  const exists = (slug: string) => categories.some((c) => c.slug === slug);
  // Many menu rows point at categories that were never created; a dead link helps nobody, so those stay hidden.
  const liveLink = (url: string | null) => {
    const category = url?.match(/^\/category\/([a-z0-9-]+)$/);
    return !category || exists(category[1]);
  };
  const link = (r: Row): NavLink => ({ id: r.id, title: r.title, url: toRoute(r.url) });
  const mainUrl = (r: Row) => {
    const own = toRoute(r.url);
    if (own && liveLink(own)) return own;
    if (exists(r.slug)) return categoryUrl(r.slug);
    const linked = categories.find((c) => c.id === r.category_id);
    return linked ? categoryUrl(linked.slug) : "/products";
  };
  return all
    .filter((r) => r.parent_id === null && r.menu_type === "main")
    .map((main) => ({
      ...link(main),
      url: mainUrl(main),
      sections: all
        .filter((r) => r.parent_id === main.id && r.menu_type === "mega")
        .map((section) => ({
          ...link(section),
          items: all.filter((r) => r.parent_id === section.id && r.menu_type === "submenu").map(link).filter((l) => liveLink(l.url)),
        })),
    }));
}
