import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { ConfirmButton, SubmitButton } from "@/components/admin/client";
import SeoShell, { Pill } from "@/components/admin/SeoShell";
import { Card, CardHead, EmptyState, iconBtnDelete, iconBtnEdit, inputCls, labelCls, smallPrimaryBtn, Th, Toggle } from "@/components/admin/ui";
import { rows, sql } from "@/lib/db";
import { deleteTrending, saveTrending } from "../actions";

export const metadata = { title: "SEO · Trending" };

type Row = { id: number; search_term: string; display_text: string | null; search_count: number | null; is_featured: number | null; sort_order: number | null; status: string };
type Props = { searchParams: Promise<{ edit?: string }> };

export default async function TrendingPage({ searchParams }: Props) {
  const { edit } = await searchParams;
  const list = await rows<Row>(sql`SELECT id, search_term, display_text, search_count, is_featured, sort_order, status FROM seo_trending_searches ORDER BY sort_order, id`);
  const editing = list.find((r) => r.id === Number(edit)) ?? null;

  return (
    <SeoShell active="trending">
      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="h-fit p-5">
          <h2 className="font-semibold">{editing ? "Edit search" : "Add a search"}</h2>
          <p className="mt-1 text-xs text-muted-foreground">Suggested in the store&apos;s search box.</p>
          <form key={editing?.id ?? "new"} action={saveTrending} className="mt-4 space-y-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div><label htmlFor="search_term" className={labelCls}>Search term</label><input id="search_term" name="search_term" required defaultValue={editing?.search_term} className={inputCls} /></div>
            <div><label htmlFor="display_text" className={labelCls}>Shown as <span className="opacity-70">(optional)</span></label><input id="display_text" name="display_text" defaultValue={editing?.display_text ?? ""} className={inputCls} /></div>
            <div><label htmlFor="sort_order" className={labelCls}>Order</label><input id="sort_order" name="sort_order" type="number" defaultValue={editing?.sort_order ?? 0} className={inputCls} /></div>
            <Toggle name="is_featured" label="Featured" defaultChecked={!!editing?.is_featured} />
            <Toggle name="is_active" label="Active" defaultChecked={editing ? editing.status === "active" : true} />
            <div className="flex items-center gap-3">
              <SubmitButton className={smallPrimaryBtn}>{editing ? "Update" : "Add search"}</SubmitButton>
              {editing && <Link href="/admin/seo/trending" className="text-xs text-muted-foreground hover:text-foreground">Cancel</Link>}
            </div>
          </form>
        </Card>
        <Card>
          <CardHead title="Trending searches" description={`${list.length} total`} />
          {list.length === 0 ? <EmptyState>No trending searches yet.</EmptyState> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr><Th>Term</Th><Th className="text-right">Order</Th><Th>Status</Th><Th /></tr></thead>
                <tbody className="divide-y">
                  {list.map((r) => (
                    <tr key={r.id} className={r.status === "active" ? "" : "opacity-60"}>
                      <td className="px-4 py-3">{r.display_text || r.search_term}{r.display_text && <div className="text-xs text-muted-foreground">{r.search_term}</div>}</td>
                      <td className="px-4 py-3 text-right text-xs">{r.sort_order ?? 0}</td>
                      <td className="px-4 py-3"><span className="flex gap-1"><Pill tone={r.status === "active" ? "ok" : "muted"}>{r.status === "active" ? "On" : "Off"}</Pill>{!!r.is_featured && <Pill tone="notice">Featured</Pill>}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Link href={`/admin/seo/trending?edit=${r.id}`} className={iconBtnEdit} title="Edit" aria-label="Edit"><Pencil className="size-4" aria-hidden="true" /></Link>
                          <form action={deleteTrending}><input type="hidden" name="id" value={r.id} /><ConfirmButton message={`Delete "${r.search_term}"?`} className={iconBtnDelete} title="Delete"><Trash2 className="size-4" aria-hidden="true" /></ConfirmButton></form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </SeoShell>
  );
}
