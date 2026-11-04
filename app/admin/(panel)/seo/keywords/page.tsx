import { SelectAll, RowCheckbox, SubmitButton } from "@/components/admin/client";
import SeoShell, { Pill } from "@/components/admin/SeoShell";
import { Card, CardHead, EmptyState, FilterTabs, inputCls, labelCls, Pagination, paging, SearchBox, secondaryBtn, smallPrimaryBtn, Th } from "@/components/admin/ui";
import { rows, sql } from "@/lib/db";
import { addKeyword, updateKeywords } from "../actions";

export const metadata = { title: "SEO · Keywords" };

type Props = { searchParams: Promise<{ q?: string; status?: string; page?: string }> };
const BASE = "/admin/seo/keywords";

export default async function KeywordsPage({ searchParams }: Props) {
  const { q = "", status = "all", page: pageParam } = await searchParams;
  const { page, perPage, offset, pages } = paging(pageParam, 50);
  const term = `%${q.trim()}%`;
  const where = sql`WHERE (${q.trim()}::text = '' OR tag_name ILIKE ${term}) AND (${status}::text = 'all' OR status = ${status})`;
  const [[totals], [{ n: total }], list] = await Promise.all([
    rows<{ all: number; active: number; inactive: number; clicks: number }>(sql`SELECT COUNT(*)::int AS all, COUNT(*) FILTER (WHERE status = 'active')::int AS active, COUNT(*) FILTER (WHERE status <> 'active')::int AS inactive, COALESCE(SUM(click_count), 0)::int AS clicks FROM seo_tags`),
    rows<{ n: number }>(sql`SELECT COUNT(*)::int AS n FROM seo_tags ${where}`),
    rows<{ id: number; tag_name: string; category_group: string | null; status: string; click_count: number | null; products: number }>(sql`
      SELECT t.id, t.tag_name, t.category_group, t.status, t.click_count, (SELECT COUNT(*)::int FROM product_seo_tags p WHERE p.tag_id = t.id) AS products
      FROM seo_tags t ${where} ORDER BY t.click_count DESC NULLS LAST, t.display_priority DESC, t.tag_name LIMIT ${perPage} OFFSET ${offset}
    `),
  ]);
  const qs = (over: Record<string, string>) => {
    const p = new URLSearchParams({ ...(q ? { q } : {}), ...(status !== "all" ? { status } : {}), ...over });
    return `${BASE}${p.size ? `?${p}` : ""}`;
  };
  const current = qs(page > 1 ? { page: String(page) } : {});

  return (
    <SeoShell active="keywords">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card>
          <CardHead title="Popular search keywords" description={`The top 300 active keywords appear in the store footer. ${totals.clicks.toLocaleString("en-IN")} clicks so far.`}>
            <SearchBox action={BASE} q={q} placeholder="Search keywords" keep={{ status: status === "all" ? "" : status }} />
          </CardHead>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
            <FilterTabs tabs={[["all", `All (${totals.all})`], ["active", `Active (${totals.active})`], ["inactive", `Off (${totals.inactive})`]]} active={status} hrefFor={(k) => `${BASE}?${new URLSearchParams({ ...(q ? { q } : {}), ...(k !== "all" ? { status: k } : {}) })}`} />
            <form id="kw-bulk" action={updateKeywords} className="flex items-center gap-2">
              <input type="hidden" name="return_to" value={current} />
              <select name="bulk_action" aria-label="Action for ticked keywords" className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs">
                <option value="deactivate">Turn off</option>
                <option value="activate">Turn on</option>
                <option value="delete">Delete</option>
              </select>
              <SubmitButton className={secondaryBtn} pending="Applying…">Apply to ticked</SubmitButton>
            </form>
          </div>
          {list.length === 0 ? <EmptyState>No keywords match.</EmptyState> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr><Th className="w-10 text-left"><SelectAll formId="kw-bulk" /></Th><Th>Keyword</Th><Th hide="hidden md:table-cell">Group</Th><Th className="text-right">Clicks</Th><Th className="text-right">Products</Th><Th>Status</Th></tr>
                </thead>
                <tbody className="divide-y">
                  {list.map((t) => (
                    <tr key={t.id}>
                      <td className="px-4 py-2.5"><RowCheckbox formId="kw-bulk" value={t.id} /></td>
                      <td className="px-4 py-2.5">{t.tag_name}</td>
                      <td className="hidden px-4 py-2.5 text-xs text-muted-foreground md:table-cell">{t.category_group}</td>
                      <td className="px-4 py-2.5 text-right text-xs">{t.click_count ?? 0}</td>
                      <td className="px-4 py-2.5 text-right text-xs">{t.products}</td>
                      <td className="px-4 py-2.5"><Pill tone={t.status === "active" ? "ok" : "muted"}>{t.status === "active" ? "On" : "Off"}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={page} totalPages={pages(total)} total={total} perPage={perPage} hrefFor={(p) => qs({ page: String(p) })} />
        </Card>
        <Card className="h-fit p-5">
          <h2 className="font-semibold">Add a keyword</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Keep this list to terms people really search for. Very long keyword lists can look like spam to Google.</p>
          <form action={addKeyword} className="mt-4 space-y-4">
            <div><label htmlFor="tag_name" className={labelCls}>Keyword</label><input id="tag_name" name="tag_name" required maxLength={255} className={inputCls} /></div>
            <div><label htmlFor="category_group" className={labelCls}>Group <span className="opacity-70">(optional)</span></label><input id="category_group" name="category_group" maxLength={100} className={inputCls} /></div>
            <SubmitButton className={smallPrimaryBtn}>Add keyword</SubmitButton>
          </form>
        </Card>
      </div>
    </SeoShell>
  );
}
