import { ArrowRight, ExternalLink, FileSearch, Map as MapIcon, ShieldCheck } from "lucide-react";
import Link from "next/link";
import SeoShell, { Pill } from "@/components/admin/SeoShell";
import { Card } from "@/components/admin/ui";
import { editHref, healthScore, ISSUES, loadSeoTargets, TYPE_LABEL, TYPE_PLURAL, TYPE_ROUTE, type IssueCode, type SeoTarget } from "@/lib/admin/seo-audit";
import { rows, sql } from "@/lib/db";
import type { SeoEntity } from "@/lib/seo";

export const metadata = { title: "SEO" };

const ORDER: IssueCode[] = ["title_duplicate", "desc_duplicate", "noindex", "title_long", "title_short", "desc_long", "desc_short", "keyword_missing", "no_image", "canonical_elsewhere", "keyword_unset"];
const SHOW_PER_ISSUE = 6;

function ScoreRing({ score }: { score: number }) {
  const tone = score >= 80 ? "#34d399" : score >= 50 ? "#fbbf24" : "#f87171";
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-32 w-32 flex-shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--muted)" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={tone} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-bold text-foreground">{score}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Health</span>
      </div>
    </div>
  );
}

export default async function SeoOverviewPage() {
  const [{ targets, settings }, [redir]] = await Promise.all([
    loadSeoTargets(),
    rows<{ total: number; active: number; hits: number }>(sql`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'active')::int AS active, COALESCE(SUM(hits), 0)::int AS hits FROM seo_redirects`),
  ]);
  const score = healthScore(targets);
  const indexable = targets.filter((t) => !t.forcedNoindex && !t.seo.noindex);
  const bySeverity = (s: string) => targets.reduce((n, t) => n + t.issues.filter((c) => ISSUES[c].severity === s).length, 0);

  const groups = ORDER.map((code) => ({ code, items: targets.filter((t) => t.issues.includes(code)) })).filter((g) => g.items.length);
  const types: SeoEntity[] = ["page", "product", "category"];
  const perType = types.map((type) => {
    const list = targets.filter((t) => t.type === type);
    return { type, total: list.length, custom: list.filter((t) => t.record).length, issues: list.filter((t) => t.issues.some((c) => ISSUES[c].severity !== "notice")).length };
  });

  const setup: [boolean, string, string][] = [
    [!!settings.googleVerification, "Google Search Console verified", "/admin/seo/settings"],
    [!!settings.bingVerification, "Bing Webmaster Tools verified", "/admin/seo/settings"],
    [!!settings.defaultImage, "Default social share image set", "/admin/seo/settings"],
    [!!settings.orgLogo, "Organisation logo for schema set", "/admin/seo/settings"],
  ];

  return (
    <SeoShell active="overview">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Card className="p-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <ScoreRing score={score} />
              <div className="grid flex-1 grid-cols-2 gap-4 2xl:grid-cols-4">
                {[
                  [targets.length, "URLs tracked", "text-foreground"],
                  [indexable.length, "Indexable", "text-primary"],
                  [bySeverity("error"), "Errors", bySeverity("error") ? "text-red-700 dark:text-red-400" : "text-muted-foreground"],
                  [bySeverity("warning"), "Warnings", bySeverity("warning") ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"],
                ].map(([n, label, cls]) => (
                  <div key={label as string}>
                    <div className={`font-display text-2xl font-bold ${cls}`}>{n}</div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-display font-semibold text-foreground">Issues to fix</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Most important first. Click a URL to open its SEO editor.</p>
            </div>
            {groups.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">No issues found. Nice work.</p>
            ) : (
              <div className="divide-y divide-border">
                {groups.map(({ code, items }) => (
                  <details key={code} className="group" open={ISSUES[code].severity === "error"}>
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 hover:bg-muted/60">
                      <Pill tone={ISSUES[code].severity}>{ISSUES[code].severity}</Pill>
                      <span className="flex-1 text-sm font-medium text-foreground">{ISSUES[code].label}</span>
                      <span className="font-mono text-xs text-muted-foreground">{items.length}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden="true" />
                    </summary>
                    <div className="px-5 pb-4">
                      <p className="mb-3 text-xs text-muted-foreground">{ISSUES[code].help}</p>
                      <ul className="space-y-1">
                        {items.slice(0, SHOW_PER_ISSUE).map((t: SeoTarget) => (
                          <li key={`${t.type}:${t.key}`}>
                            <Link href={editHref(t.type, t.key)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted/60">
                              <span className="w-24 flex-shrink-0 text-[11px] text-muted-foreground">{TYPE_LABEL[t.type]}</span>
                              <span className="min-w-0 flex-1 truncate text-foreground">{t.label}</span>
                              <span className="hidden max-w-[45%] truncate font-mono text-[11px] text-muted-foreground sm:block">{t.path}</span>
                              <span className="text-xs text-primary">Fix</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                      {items.length > SHOW_PER_ISSUE && (
                        <p className="mt-2 px-3 text-xs text-muted-foreground">
                          + {items.length - SHOW_PER_ISSUE} more
                          
                        </p>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-display font-semibold text-foreground">Coverage</h2>
            </div>
            <div className="divide-y divide-border">
              {perType.map((r) => (
                <Link key={r.type} href={`/admin/seo/${TYPE_ROUTE[r.type]}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/60">
                  <div className="flex-1">
                    <div className="text-sm text-foreground">{TYPE_PLURAL[r.type]}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {r.total} URLs · {r.custom} customised
                    </div>
                  </div>
                  {r.issues ? <Pill tone="warning">{r.issues} need work</Pill> : <Pill tone="ok">OK</Pill>}
                </Link>
              ))}
              <Link href="/admin/seo/redirects" className="flex items-center gap-3 px-5 py-3 hover:bg-muted/60">
                <div className="flex-1">
                  <div className="text-sm text-foreground">Redirects</div>
                  <div className="text-[11px] text-muted-foreground">
                    {redir.active} active of {redir.total} · {redir.hits.toLocaleString("en-IN")} hits
                  </div>
                </div>
              </Link>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 font-display font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" /> Setup
            </h2>
            <ul className="space-y-2">
              {setup.map(([ok, label, href]) => (
                <li key={label}>
                  <Link href={href} className="flex items-center gap-2 text-xs hover:underline">
                    <span className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-400" : "bg-zinc-600"}`} />
                    <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-display font-semibold text-foreground">Files for search engines</h2>
            <div className="space-y-2 text-sm">
              <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-foreground hover:text-primary">
                <MapIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> sitemap.xml <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
              <a href="/robots.txt" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-foreground hover:text-primary">
                <FileSearch className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> robots.txt <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">The sitemap lists every indexable URL above and leaves out anything set to noindex or canonicalised elsewhere. Submit it once in Search Console.</p>
          </Card>
        </div>
      </div>
    </SeoShell>
  );
}
