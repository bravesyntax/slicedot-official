import { ExternalLink, PencilLine, RotateCcw } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/admin/client";
import SeoMetaEditor from "@/components/admin/SeoMetaEditor";
import SeoShell, { type SeoTab } from "@/components/admin/SeoShell";
import { BackLink } from "@/components/admin/ui";
import { ISSUES, loadSeoTarget, TYPE_LABEL, TYPE_PLURAL, TYPE_ROUTE } from "@/lib/admin/seo-audit";
import { SITE_URL } from "@/lib/config";
import type { SeoEntity } from "@/lib/seo";
import { DESCRIPTION_RANGE, TITLE_RANGE } from "@/lib/seo-pages";
import { resetSeoMeta, saveSeoMeta } from "../actions";
import { aiSeoCopy } from "../../ai-actions";
import { aiConfigured } from "@/lib/ai";

export const metadata = { title: "SEO · Edit" };

type Props = { searchParams: Promise<{ type?: string; key?: string }> };

const TYPES: SeoEntity[] = ["page", "product", "category"];

/** Where the content itself (not its SEO) is edited. */
function contentHref(type: SeoEntity, key: string): string | null {
  if (type === "product") return `/admin/products/${key}`;
  if (type === "category") return `/admin/categories?edit=${key}`;
  return null;
}

export default async function SeoEditPage({ searchParams }: Props) {
  const { type = "", key = "" } = await searchParams;
  if (!TYPES.includes(type as SeoEntity) || !key) notFound();
  const { target: t, settings, all } = await loadSeoTarget(type as SeoEntity, key);
  if (!t) notFound();

  const others = all.filter((o) => o !== t && !o.forcedNoindex && !o.seo.noindex);
  const listHref = `/admin/seo/${TYPE_ROUTE[t.type]}`;
  const tab = TYPE_ROUTE[t.type] as SeoTab;
  const content = contentHref(t.type, t.key);
  const defaultsTitle = t.defaults.suffix ? `${t.defaults.title}${settings.titleSuffix}` : t.defaults.title;

  return (
    <SeoShell active={tab}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <BackLink href={listHref}>All {TYPE_PLURAL[t.type].toLowerCase()}</BackLink>
          <h2 className="mt-3 truncate font-display text-xl font-bold text-foreground">{t.label}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {TYPE_LABEL[t.type]} · <span className="font-mono">{t.path}</span> ·{" "}
            {t.record ? `Customised${t.record.updated_at ? `, saved ${new Date(t.record.updated_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}` : ""}` : "Using defaults"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <a href={t.path} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline">
            View page <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
          {content && (
            <Link href={content} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
              <PencilLine className="h-3.5 w-3.5" aria-hidden="true" /> Edit content
            </Link>
          )}
          {t.record && (
            <form action={resetSeoMeta}>
              <input type="hidden" name="entity_type" value={t.type} />
              <input type="hidden" name="entity_key" value={t.key} />
              <ConfirmButton message="Remove all custom SEO for this URL and go back to the defaults?" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-red-700 dark:text-red-400">
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset to defaults
              </ConfirmButton>
            </form>
          )}
        </div>
      </div>

      {t.issues.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {t.issues.map((c) => (
            <span key={c} title={ISSUES[c].help} className={`rounded-lg border px-2.5 py-1 text-xs ${ISSUES[c].severity === "error" ? "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-400" : ISSUES[c].severity === "warning" ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400" : "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-400"}`}>
              {ISSUES[c].label}
            </span>
          ))}
        </div>
      )}

      <SeoMetaEditor
        key={t.record?.updated_at ? String(t.record.updated_at) : "new"}
        entityType={t.type}
        entityKey={t.key}
        values={{
          title: t.record?.title ?? "",
          description: t.record?.description ?? "",
          focus_keyword: t.record?.focus_keyword ?? "",
          og_image: t.record?.og_image ?? "",
          canonical_url: t.record?.canonical_url ?? "",
          noindex: !!t.record?.noindex,
          schema_json: t.record?.schema_json ?? "",
        }}
        defaults={{
          title: defaultsTitle,
          description: t.defaults.description?.trim() || settings.defaultDescription,
          image: t.defaults.image || settings.defaultImage,
          canonical: t.path === "/" ? SITE_URL : `${SITE_URL}${t.path}`,
        }}
        url={t.path}
        siteName={settings.orgName}
        otherTitles={others.map((o) => o.seo.title.toLowerCase())}
        otherDescriptions={others.map((o) => o.seo.description.toLowerCase())}
        forcedNoindex={t.forcedNoindex}
        titleRange={TITLE_RANGE as [number, number]}
        descriptionRange={DESCRIPTION_RANGE as [number, number]}
        action={saveSeoMeta}
        suggest={aiConfigured() ? aiSeoCopy.bind(null, t.type, t.key) : undefined}
      />
    </SeoShell>
  );
}

