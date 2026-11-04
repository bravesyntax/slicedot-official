import { ArrowRight, Pencil, Power, Trash2 } from "lucide-react";
import Link from "next/link";
import { ConfirmButton, SubmitButton } from "@/components/admin/client";
import SeoShell, { Pill } from "@/components/admin/SeoShell";
import { Card, EmptyState, iconBtnDelete, iconBtnEdit, iconBtnToggle, inputCls, labelCls, smallPrimaryBtn, Th, timeAgo, Toggle } from "@/components/admin/ui";
import { rows, sql } from "@/lib/db";
import { deleteRedirect, saveRedirect, toggleRedirect } from "../actions";

export const metadata = { title: "SEO · Redirects" };

type Redirect = { id: number; old_url: string; new_url: string; redirect_type: string; status: string; hits: number | null; last_hit_at: Date | null; note: string | null; created_at: Date };
type Props = { searchParams: Promise<{ edit?: string; q?: string }> };

const STATUS: Record<number, [string, string]> = {
  301: ["301 Permanent", "Page moved for good. Passes ranking to the new URL."],
  302: ["302 Temporary", "Short-term move; Google keeps the old URL indexed."],
  410: ["410 Gone", "Removed on purpose; Google drops it faster than a 404."],
};

export default async function RedirectsPage({ searchParams }: Props) {
  const { edit, q = "" } = await searchParams;
  const term = `%${q.trim()}%`;
  const list = await rows<Redirect>(sql`
    SELECT id, old_url, new_url, redirect_type, status, hits, last_hit_at, note, created_at FROM seo_redirects
    WHERE ${q.trim()}::text = '' OR old_url ILIKE ${term} OR new_url ILIKE ${term} OR COALESCE(note, '') ILIKE ${term}
    ORDER BY created_at DESC, id DESC
  `);
  const editing = edit ? (await rows<Redirect>(sql`SELECT * FROM seo_redirects WHERE id = ${Number(edit) || 0}`))[0] ?? null : null;

  return (
    <SeoShell active="redirects">
      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="h-fit p-6">
          <h2 className="font-display font-semibold text-foreground">{editing ? "Edit redirect" : "Add a redirect"}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Send visitors and Google from an old URL to a new one. Use <code className="font-mono text-primary">/old-section/*</code> to move a whole section; a{" "}
            <code className="font-mono text-primary">*</code> in the destination receives the rest of the path.
          </p>
          <form key={editing?.id ?? "new"} action={saveRedirect} className="mt-5 space-y-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div>
              <label htmlFor="old_url" className={labelCls}>
                Old path
              </label>
              <input id="old_url" name="old_url" required defaultValue={editing?.old_url} placeholder="/old-page" className={inputCls} />
            </div>
            <div>
              <label htmlFor="new_url" className={labelCls}>
                Redirect to <span className="text-muted-foreground">(not needed for 410)</span>
              </label>
              <input id="new_url" name="new_url" defaultValue={editing?.new_url} placeholder="/new-page or https://…" className={inputCls} />
            </div>
            <fieldset>
              <legend className={labelCls}>Type</legend>
              <div className="space-y-2">
                {Object.entries(STATUS).map(([code, [label, help]]) => (
                  <label key={code} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 has-[:checked]:border-primary/50 has-[:checked]:bg-primary/5">
                    <input type="radio" name="redirect_type" value={code} defaultChecked={(editing?.redirect_type ?? "301") === code} className="mt-0.5 accent-emerald-500" />
                    <span>
                      <span className="block text-sm text-foreground">{label}</span>
                      <span className="block text-[11px] text-muted-foreground">{help}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label htmlFor="note" className={labelCls}>
                Note <span className="text-muted-foreground">(optional)</span>
              </label>
              <input id="note" name="note" maxLength={255} defaultValue={editing?.note ?? ""} placeholder="Why this exists" className={inputCls} />
            </div>
            <Toggle name="is_active" label="Active" defaultChecked={editing ? editing.status === "active" : true} />
            <div className="flex items-center gap-3 pt-2">
              <SubmitButton className={smallPrimaryBtn}>{editing ? "Update redirect" : "Add redirect"}</SubmitButton>
              {editing && (
                <Link href="/admin/seo/redirects" className="text-xs text-muted-foreground hover:text-foreground">
                  Cancel
                </Link>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">Changes reach the live site within about a minute.</p>
          </form>
        </Card>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="font-display font-semibold text-foreground">Redirects</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{list.length} {q ? "matching" : "total"} · hits count every visit that was redirected</p>
            </div>
            <form action="/admin/seo/redirects" className="flex gap-2">
              <input name="q" defaultValue={q} placeholder="Search paths or notes" aria-label="Search redirects" className="w-56 rounded-lg border border-border bg-muted/50 px-3 py-1.5 font-mono text-xs text-foreground focus:border-primary focus:outline-none" />
            </form>
          </div>
          {list.length === 0 ? (
            <EmptyState>{q ? "No redirects match." : "No redirects yet. Add one when you rename or remove a page."}</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <Th>From → To</Th>
                    <Th>Type</Th>
                    <Th className="text-right">Hits</Th>
                    <Th hide="hidden md:table-cell">Last hit</Th>
                    <Th className="text-right" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {list.map((r) => (
                    <tr key={r.id} className={r.status === "active" ? "" : "opacity-50"}>
                      <td className="max-w-md px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                          <span className="text-foreground">{r.old_url}</span>
                          {r.redirect_type !== "410" && (
                            <>
                              <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                              <span className="break-all text-primary">{r.new_url}</span>
                            </>
                          )}
                        </div>
                        {r.note && <div className="mt-1 text-[11px] text-muted-foreground">{r.note}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <Pill tone={r.redirect_type === "410" ? "error" : r.redirect_type === "302" ? "warning" : "ok"}>{r.redirect_type}</Pill>
                        {r.status !== "active" && <span className="ml-1.5 text-[10px] text-muted-foreground">off</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-foreground">{(r.hits ?? 0).toLocaleString("en-IN")}</td>
                      <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">{r.last_hit_at ? timeAgo(r.last_hit_at) : "Never"}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Link href={`/admin/seo/redirects?edit=${r.id}`} className={iconBtnEdit} title="Edit" aria-label="Edit">
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Link>
                          <form action={toggleRedirect}>
                            <input type="hidden" name="id" value={r.id} />
                            <button type="submit" className={iconBtnToggle} title={r.status === "active" ? "Turn off" : "Turn on"} aria-label={r.status === "active" ? "Turn off" : "Turn on"}>
                              <Power className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </form>
                          <form action={deleteRedirect}>
                            <input type="hidden" name="id" value={r.id} />
                            <ConfirmButton message={`Delete the redirect for ${r.old_url}?`} className={iconBtnDelete} title="Delete">
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </ConfirmButton>
                          </form>
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
