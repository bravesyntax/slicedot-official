import { Mail, MailOpen, Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/admin/client";
import { AdminPage, Card, CardHead, EmptyState, FilterTabs, formatDate, iconBtnDelete, iconBtnEdit, Pagination, paging } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { finish, intField } from "@/lib/admin/common";
import { rows, sql } from "@/lib/db";
import { field } from "@/lib/validation";

export const metadata = { title: "Messages" };

const BASE = "/admin/messages";
const backTo = (fd: FormData) => (field(fd, "return_to").startsWith(BASE) ? field(fd, "return_to") : BASE);

async function toggleRead(fd: FormData) {
  "use server";
  await requireAdmin();
  await sql`UPDATE contact_messages SET is_read = 1 - is_read WHERE id = ${intField(fd, "id")}`;
  await finish("success", "Message updated.", backTo(fd));
}

async function deleteMessage(fd: FormData) {
  "use server";
  await requireAdmin();
  await sql`DELETE FROM contact_messages WHERE id = ${intField(fd, "id")}`;
  await finish("success", "Message deleted.", backTo(fd));
}

type Props = { searchParams: Promise<{ filter?: string; page?: string }> };

export default async function MessagesPage({ searchParams }: Props) {
  const { filter = "all", page: pageParam } = await searchParams;
  const { page, perPage, offset, pages } = paging(pageParam, 20);
  const where = sql`WHERE (${filter}::text <> 'unread' OR is_read = 0)`;
  const [[{ n: total }], [{ unread }], list] = await Promise.all([
    rows<{ n: number }>(sql`SELECT COUNT(*)::int AS n FROM contact_messages ${where}`),
    rows<{ unread: number }>(sql`SELECT COUNT(*)::int AS unread FROM contact_messages WHERE is_read = 0`),
    rows<{ id: number; name: string; email: string; phone: string | null; subject: string | null; message: string; is_read: number; created_at: Date }>(sql`
      SELECT id, name, email, phone, subject, message, is_read, created_at FROM contact_messages ${where} ORDER BY created_at DESC, id DESC LIMIT ${perPage} OFFSET ${offset}
    `),
  ]);
  const current = `${BASE}?${new URLSearchParams({ ...(filter !== "all" ? { filter } : {}), ...(page > 1 ? { page: String(page) } : {}) })}`;

  return (
    <AdminPage title="Messages">
      <Card>
        <CardHead title="Contact form messages" description={`${unread} unread`}>
          <FilterTabs tabs={[["all", "All"], ["unread", `Unread (${unread})`]]} active={filter} hrefFor={(k) => (k === "all" ? BASE : `${BASE}?filter=${k}`)} />
        </CardHead>
        {list.length === 0 ? <EmptyState>No messages here.</EmptyState> : (
          <ul className="divide-y">
            {list.map((m) => (
              <li key={m.id} className={`flex items-start gap-3 px-5 py-4 ${m.is_read ? "" : "bg-muted/40"}`}>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${m.is_read ? "" : "font-semibold"}`}>{m.subject || "No subject"}</p>
                  <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">{m.message}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {m.name} · <a href={`mailto:${m.email}`} className="break-all underline underline-offset-4">{m.email}</a>{m.phone ? ` · ${m.phone}` : ""} · {formatDate(m.created_at)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <form action={toggleRead}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="return_to" value={current} /><button type="submit" className={iconBtnEdit} title={m.is_read ? "Mark unread" : "Mark read"} aria-label={m.is_read ? "Mark unread" : "Mark read"}>{m.is_read ? <Mail className="size-4" aria-hidden="true" /> : <MailOpen className="size-4" aria-hidden="true" />}</button></form>
                  <form action={deleteMessage}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="return_to" value={current} /><ConfirmButton message="Permanently delete this message?" className={iconBtnDelete} title="Delete"><Trash2 className="size-4" aria-hidden="true" /></ConfirmButton></form>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Pagination page={page} totalPages={pages(total)} total={total} perPage={perPage} hrefFor={(p) => `${BASE}?${new URLSearchParams({ ...(filter !== "all" ? { filter } : {}), page: String(p) })}`} />
      </Card>
    </AdminPage>
  );
}
