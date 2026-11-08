import { AiSearchFix } from "@/components/admin/AiTools";
import SeoShell, { Pill } from "@/components/admin/SeoShell";
import { Card, CardHead, EmptyState } from "@/components/admin/ui";
import { aiConfigured } from "@/lib/ai";
import { listProducts } from "@/lib/catalog";
import { rows, sql } from "@/lib/db";
import { parseFilters } from "@/lib/listing";
import { isLoggableSearch } from "@/lib/search";

export const metadata = { title: "SEO · Searches" };

// What shoppers typed into the store's search over the last 30 days. Searches that still find nothing are checked
// again against today's catalogue, so a search fixed since then drops off the list.
export default async function SearchesPage() {
  const logged = await rows<{ term: string; searches: number; last_results: number }>(sql`
    SELECT lower(search_query) AS term, COUNT(*)::int AS searches,
      (array_agg(results_count ORDER BY created_at DESC))[1]::int AS last_results
    FROM search_logs WHERE created_at > LOCALTIMESTAMP - INTERVAL '30 days'
    GROUP BY 1 ORDER BY 2 DESC LIMIT 200
  `);
  const terms = logged.filter((t) => isLoggableSearch(t.term));
  const candidates = terms.filter((t) => t.last_results === 0).slice(0, 20);
  const now = await Promise.all(candidates.map((t) => listProducts(parseFilters({ search: t.term }), 1).then((r) => r.total)));
  const failing = candidates.filter((_, i) => now[i] === 0);
  const ai = aiConfigured();

  return (
    <SeoShell active="searches">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHead title="Searches that find nothing" description="Shoppers who leave without finding a product. Add a keyword to the right products and the search starts working." />
          {failing.length === 0 ? <EmptyState>Every recent search finds something.</EmptyState> : (
            <ul className="divide-y">
              {failing.map((t) => (
                <li key={t.term} className="space-y-2 px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{t.term}</span>
                    <Pill tone="warning">{t.searches} search{t.searches === 1 ? "" : "es"}</Pill>
                    <a href={`/products?search=${encodeURIComponent(t.term)}`} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground underline underline-offset-4">Try it</a>
                  </div>
                  {ai && <AiSearchFix term={t.term} />}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHead title="Top searches" description="Last 30 days" />
          {terms.length === 0 ? <EmptyState>No searches yet.</EmptyState> : (
            <ul className="divide-y">
              {terms.slice(0, 25).map((t) => (
                <li key={t.term} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                  <span className="truncate">{t.term}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{t.searches}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </SeoShell>
  );
}
