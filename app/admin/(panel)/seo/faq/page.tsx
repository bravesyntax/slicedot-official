import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { ConfirmButton, SubmitButton } from "@/components/admin/client";
import SeoShell, { Pill } from "@/components/admin/SeoShell";
import { Card, CardHead, EmptyState, iconBtnDelete, iconBtnEdit, inputCls, labelCls, smallPrimaryBtn, Toggle } from "@/components/admin/ui";
import { rows, sql } from "@/lib/db";
import { deleteFaq, saveFaq } from "../actions";

export const metadata = { title: "SEO · FAQ" };

type Row = { id: number; question: string; answer: string; page: string | null; sort_order: number | null; status: string };
type Props = { searchParams: Promise<{ edit?: string }> };

export default async function FaqPage({ searchParams }: Props) {
  const { edit } = await searchParams;
  const list = await rows<Row>(sql`SELECT id, question, answer, page, sort_order, status FROM seo_faq ORDER BY sort_order, id`);
  const editing = list.find((r) => r.id === Number(edit)) ?? null;

  return (
    <SeoShell active="faq">
      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="h-fit p-5">
          <h2 className="font-semibold">{editing ? "Edit question" : "Add a question"}</h2>
          <p className="mt-1 text-xs text-muted-foreground">Shown on the home page with FAQ structured data.</p>
          <form key={editing?.id ?? "new"} action={saveFaq} className="mt-4 space-y-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div><label htmlFor="question" className={labelCls}>Question</label><input id="question" name="question" required defaultValue={editing?.question} className={inputCls} /></div>
            <div><label htmlFor="answer" className={labelCls}>Answer</label><textarea id="answer" name="answer" required rows={5} defaultValue={editing?.answer} className={`${inputCls} resize-y`} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label htmlFor="page" className={labelCls}>Shown on</label><select id="page" name="page" defaultValue={editing?.page ?? "homepage"} className={inputCls}><option value="homepage">Home page</option><option value="all">All FAQ areas</option></select></div>
              <div><label htmlFor="sort_order" className={labelCls}>Order</label><input id="sort_order" name="sort_order" type="number" defaultValue={editing?.sort_order ?? 0} className={inputCls} /></div>
            </div>
            <Toggle name="is_active" label="Active" defaultChecked={editing ? editing.status === "active" : true} />
            <div className="flex items-center gap-3">
              <SubmitButton className={smallPrimaryBtn}>{editing ? "Update" : "Add question"}</SubmitButton>
              {editing && <Link href="/admin/seo/faq" className="text-xs text-muted-foreground hover:text-foreground">Cancel</Link>}
            </div>
          </form>
        </Card>
        <Card>
          <CardHead title="Questions" description={`${list.length} total`} />
          {list.length === 0 ? <EmptyState>No questions yet.</EmptyState> : (
            <ul className="divide-y">
              {list.map((r) => (
                <li key={r.id} className={`flex items-start gap-3 px-5 py-4 ${r.status === "active" ? "" : "opacity-60"}`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{r.question}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.answer}</p>
                    <div className="mt-2 flex gap-1"><Pill tone={r.status === "active" ? "ok" : "muted"}>{r.status === "active" ? "On" : "Off"}</Pill><Pill tone="muted">{r.page === "all" ? "All FAQ areas" : "Home page"}</Pill></div>
                  </div>
                  <div className="flex gap-1">
                    <Link href={`/admin/seo/faq?edit=${r.id}`} className={iconBtnEdit} title="Edit" aria-label="Edit"><Pencil className="size-4" aria-hidden="true" /></Link>
                    <form action={deleteFaq}><input type="hidden" name="id" value={r.id} /><ConfirmButton message="Delete this question?" className={iconBtnDelete} title="Delete"><Trash2 className="size-4" aria-hidden="true" /></ConfirmButton></form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </SeoShell>
  );
}
