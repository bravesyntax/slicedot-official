import { Check, Star, Trash2, X } from "lucide-react";
import Link from "next/link";
import { ConfirmButton, SubmitButton } from "@/components/admin/client";
import { AiReviewReply } from "@/components/admin/AiTools";
import { Pill } from "@/components/admin/SeoShell";
import { AdminPage, Card, CardHead, EmptyState, FilterTabs, formatDate, iconBtnDelete, iconBtnEdit, inputCls, Pagination, paging, secondaryBtn } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { finish, intField, refreshPublicSite } from "@/lib/admin/common";
import { aiConfigured } from "@/lib/ai";
import { rows, sql } from "@/lib/db";
import { field } from "@/lib/validation";

export const metadata = { title: "Reviews" };

const BASE = "/admin/reviews";
const backTo = (fd: FormData) => (field(fd, "return_to").startsWith(BASE) ? field(fd, "return_to") : BASE);
const TONE = { approved: "ok", pending: "warning", rejected: "error" } as const;

async function setStatus(fd: FormData) {
  "use server";
  await requireAdmin();
  const status = field(fd, "status");
  if (status !== "approved" && status !== "rejected") await finish("error", "Pick a valid action.", backTo(fd));
  await sql`UPDATE product_reviews SET status = ${status} WHERE id = ${intField(fd, "id")}`;
  refreshPublicSite();
  await finish("success", status === "approved" ? "Review approved. It's live on the product page." : "Review rejected. It won't be shown.", backTo(fd));
}

async function saveReply(fd: FormData) {
  "use server";
  const admin = await requireAdmin();
  const reply = field(fd, "reply").slice(0, 2000) || null;
  await sql`UPDATE product_reviews SET admin_reply = ${reply}, has_reply = ${reply ? 1 : 0}, admin_reply_by = ${reply ? admin.username : null}, admin_reply_at = ${reply ? new Date() : null} WHERE id = ${intField(fd, "id")}`;
  refreshPublicSite();
  await finish("success", reply ? "Reply saved." : "Reply removed.", backTo(fd));
}

async function deleteReview(fd: FormData) {
  "use server";
  await requireAdmin();
  const id = intField(fd, "id");
  await sql.begin(async (tx) => {
    await tx`DELETE FROM review_helpful WHERE review_id = ${id}`;
    await tx`DELETE FROM review_images WHERE review_id = ${id}`;
    await tx`DELETE FROM product_reviews WHERE id = ${id}`;
  });
  refreshPublicSite();
  await finish("success", "Review deleted.", backTo(fd));
}

type Props = { searchParams: Promise<{ status?: string; page?: string }> };

export default async function ReviewsPage({ searchParams }: Props) {
  const { status = "pending", page: pageParam } = await searchParams;
  const { page, perPage, offset, pages } = paging(pageParam, 20);
  const where = sql`WHERE (${status}::text = 'all' OR r.status = ${status})`;
  const [counts, [{ n: total }], list] = await Promise.all([
    rows<{ status: string; n: number }>(sql`SELECT status, COUNT(*)::int AS n FROM product_reviews GROUP BY 1`),
    rows<{ n: number }>(sql`SELECT COUNT(*)::int AS n FROM product_reviews r ${where}`),
    rows<{ id: number; product_id: number; product: string | null; slug: string | null; customer_name: string; customer_email: string; rating: number; title: string | null; review_text: string; verified_purchase: number | null; status: keyof typeof TONE; admin_reply: string | null; created_at: Date }>(sql`
      SELECT r.id, r.product_id, p.name AS product, p.slug, r.customer_name, r.customer_email, r.rating, r.title, r.review_text, r.verified_purchase, r.status, r.admin_reply, r.created_at
      FROM product_reviews r LEFT JOIN products p ON p.id = r.product_id ${where} ORDER BY r.created_at DESC, r.id DESC LIMIT ${perPage} OFFSET ${offset}
    `),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;
  const current = `${BASE}?${new URLSearchParams({ status, ...(page > 1 ? { page: String(page) } : {}) })}`;
  const ai = aiConfigured();
  const Hidden = ({ id }: { id: number }) => <><input type="hidden" name="id" value={id} /><input type="hidden" name="return_to" value={current} /></>;

  return (
    <AdminPage title="Reviews">
      <Card>
        <CardHead title="Customer reviews" description="Reviews from signed-out visitors wait here for approval.">
          <FilterTabs tabs={[["pending", `Pending (${count("pending")})`], ["approved", `Approved (${count("approved")})`], ["rejected", `Rejected (${count("rejected")})`], ["all", "All"]]} active={status} hrefFor={(k) => `${BASE}?status=${k}`} />
        </CardHead>
        {list.length === 0 ? <EmptyState>{status === "pending" ? "Nothing waiting for approval." : "No reviews here."}</EmptyState> : (
          <ul className="divide-y">
            {list.map((r) => (
              <li key={r.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex gap-0.5" aria-label={`${r.rating} out of 5`}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`size-3.5 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} aria-hidden="true" />)}</span>
                      <Pill tone={TONE[r.status] ?? "muted"}>{r.status}</Pill>
                      {!!r.verified_purchase && <Pill tone="notice">Verified purchase</Pill>}
                    </div>
                    {r.title && <p className="mt-2 text-sm font-medium">{r.title}</p>}
                    <p className="mt-1 text-sm whitespace-pre-line">{r.review_text}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {r.customer_name} · <span className="break-all">{r.customer_email}</span> · {formatDate(r.created_at)}
                      {r.product && <> · <Link href={`/admin/products/${r.product_id}`} className="underline underline-offset-4">{r.product}</Link></>}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {r.status !== "approved" && <form action={setStatus}><Hidden id={r.id} /><input type="hidden" name="status" value="approved" /><button type="submit" className={iconBtnEdit} title="Approve" aria-label="Approve"><Check className="size-4" aria-hidden="true" /></button></form>}
                    {r.status !== "rejected" && <form action={setStatus}><Hidden id={r.id} /><input type="hidden" name="status" value="rejected" /><button type="submit" className={iconBtnEdit} title="Reject" aria-label="Reject"><X className="size-4" aria-hidden="true" /></button></form>}
                    <form action={deleteReview}><Hidden id={r.id} /><ConfirmButton message="Permanently delete this review?" className={iconBtnDelete} title="Delete"><Trash2 className="size-4" aria-hidden="true" /></ConfirmButton></form>
                  </div>
                </div>
                <form action={saveReply} className="mt-3 flex gap-2">
                  <Hidden id={r.id} />
                  <input id={`reply-${r.id}`} name="reply" defaultValue={r.admin_reply ?? ""} placeholder="Public reply from the store (optional)" aria-label="Public reply" maxLength={2000} className={inputCls} />
                  <SubmitButton className={secondaryBtn}>Save</SubmitButton>
                </form>
                {ai && <div className="mt-2"><AiReviewReply reviewId={r.id} /></div>}
              </li>
            ))}
          </ul>
        )}
        <Pagination page={page} totalPages={pages(total)} total={total} perPage={perPage} hrefFor={(p) => `${BASE}?${new URLSearchParams({ status, page: String(p) })}`} />
      </Card>
    </AdminPage>
  );
}
