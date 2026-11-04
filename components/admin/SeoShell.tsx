import { ArrowRightLeft, CircleHelp, FileText, FolderTree, Gauge, Hash, Package, Settings2, TrendingUp, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AdminPage } from "./ui";

// Frame for every screen of Admin → SEO: the page header plus the section tabs.

export type SeoTab = "overview" | "pages" | "products" | "categories" | "redirects" | "keywords" | "trending" | "faq" | "settings";

const TABS: [SeoTab, string, string, LucideIcon][] = [
  ["overview", "Overview", "/admin/seo", Gauge],
  ["pages", "Pages", "/admin/seo/pages", FileText],
  ["products", "Products", "/admin/seo/products", Package],
  ["categories", "Categories", "/admin/seo/categories", FolderTree],
  ["redirects", "Redirects", "/admin/seo/redirects", ArrowRightLeft],
  ["keywords", "Keywords", "/admin/seo/keywords", Hash],
  ["trending", "Trending", "/admin/seo/trending", TrendingUp],
  ["faq", "FAQ", "/admin/seo/faq", CircleHelp],
  ["settings", "Settings", "/admin/seo/settings", Settings2],
];

export default function SeoShell({ active, children }: { active: SeoTab; children: ReactNode }) {
  return (
    <AdminPage title="SEO">
      <nav aria-label="SEO sections" className="-mx-4 -mt-4 mb-6 overflow-x-auto border-b px-4 sm:-mx-6 sm:-mt-6 sm:px-6">
        <div className="flex min-w-max gap-1">
          {TABS.map(([key, label, href, Icon]) => {
            const on = key === active;
            return (
              <Link
                key={key}
                href={href}
                aria-current={on ? "page" : undefined}
                className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm transition-colors ${
                  on ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`h-4 w-4 ${on ? "text-primary" : ""}`} aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
      {children}
    </AdminPage>
  );
}

const SEVERITY_CLS = {
  error: "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-400",
  warning: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  notice: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  ok: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  muted: "border-border bg-muted text-muted-foreground",
} as const;

export function Pill({ tone, children }: { tone: keyof typeof SEVERITY_CLS; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-medium ${SEVERITY_CLS[tone]}`}>{children}</span>;
}

/** Colour for an order or payment status. */
export const statusTone = (s: string): keyof typeof SEVERITY_CLS => (s === "delivered" || s === "paid" ? "ok" : s === "cancelled" || s === "failed" ? "error" : s === "shipped" || s === "processing" || s === "confirmed" ? "notice" : s === "refunded" ? "muted" : "warning");
