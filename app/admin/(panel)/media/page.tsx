import { Trash2 } from "lucide-react";
import { ConfirmButton, SubmitButton } from "@/components/admin/client";
import { AdminPage, Card, CardHead, EmptyState, iconBtnDelete, inputCls, Pagination, paging, SearchBox, secondaryBtn } from "@/components/admin/ui";
import MediaUploader from "@/components/admin/MediaUploader";
import { requireAdmin } from "@/lib/admin/auth";
import { finish, intField } from "@/lib/admin/common";
import { deleteImage, isOwnUpload, uploadMode } from "@/lib/admin/images";
import { rows, sql } from "@/lib/db";
import { field } from "@/lib/validation";

export const metadata = { title: "Media" };

const BASE = "/admin/media";
const backTo = (fd: FormData) => (field(fd, "return_to").startsWith(BASE) ? field(fd, "return_to") : BASE);
const urlOf = (filePath: string) => (/^https?:\/\//i.test(filePath) ? filePath : `/${filePath}`);
/** What other tables store for this file: the bare filename, or the whole Blob URL. */
const storedName = (filePath: string) => (/^https?:\/\//i.test(filePath) ? filePath : (filePath.split("/").pop() ?? filePath));

async function addMedia(values: { path: string; name: string; type: string; size: number }[]) {
  "use server";
  await requireAdmin();
  for (const v of values) {
    if (!(await isOwnUpload("products", v.path))) continue;
    const filePath = /^https?:\/\//i.test(v.path) ? v.path : `uploads/products/${v.path}`;
    await sql`INSERT INTO media_library (file_name, original_name, file_path, file_type, mime_type, file_size, folder) VALUES (${storedName(v.path).slice(-255)}, ${v.name.slice(0, 255)}, ${filePath}, 'image', ${v.type.slice(0, 100)}, ${v.size}, 'products')`;
  }
}

async function saveAlt(fd: FormData) {
  "use server";
  await requireAdmin();
  await sql`UPDATE media_library SET alt_text = ${field(fd, "alt_text").slice(0, 500) || null} WHERE id = ${intField(fd, "id")}`;
  await finish("success", "Alt text saved.", backTo(fd));
}

async function deleteMedia(fd: FormData) {
  "use server";
  await requireAdmin();
  const id = intField(fd, "id");
  const [item] = await rows<{ file_path: string }>(sql`SELECT file_path FROM media_library WHERE id = ${id}`);
  if (!item) await finish("error", "That file is already gone.", backTo(fd));
  const name = storedName(item.file_path);
  const [{ n }] = await rows<{ n: number }>(sql`
    SELECT (SELECT COUNT(*) FROM products WHERE image = ${name} OR og_image = ${name}) + (SELECT COUNT(*) FROM product_images WHERE image_path = ${name}) + (SELECT COUNT(*) FROM categories WHERE image = ${name}) AS n
  `);
  if (Number(n)) await finish("error", "This image is used by a product or category. Remove it there first.", backTo(fd));
  await sql`DELETE FROM media_library WHERE id = ${id}`;
  await deleteImage("products", name);
  await finish("success", "File removed from the library.", backTo(fd));
}

type Props = { searchParams: Promise<{ q?: string; page?: string }> };

export default async function MediaPage({ searchParams }: Props) {
  const { q = "", page: pageParam } = await searchParams;
  const { page, perPage, offset, pages } = paging(pageParam, 24);
  const term = `%${q.trim()}%`;
  const where = sql`WHERE (${q.trim()}::text = '' OR original_name ILIKE ${term} OR alt_text ILIKE ${term})`;
  const [[{ n: total }], list] = await Promise.all([
    rows<{ n: number }>(sql`SELECT COUNT(*)::int AS n FROM media_library ${where}`),
    rows<{ id: number; original_name: string; file_path: string; alt_text: string | null; file_size: number }>(sql`
      SELECT id, original_name, file_path, alt_text, file_size FROM media_library ${where} ORDER BY id DESC LIMIT ${perPage} OFFSET ${offset}
    `),
  ]);
  const current = `${BASE}?${new URLSearchParams({ ...(q ? { q } : {}), ...(page > 1 ? { page: String(page) } : {}) })}`;

  return (
    <AdminPage title="Media">
      <Card className="mb-6 p-5"><MediaUploader mode={uploadMode()} onUploaded={addMedia} /></Card>
      <Card>
        <CardHead title="Library" description={`${total} ${q ? "matching" : "files"}`}><SearchBox action={BASE} q={q} placeholder="Search files" /></CardHead>
        {list.length === 0 ? <EmptyState>No files here.</EmptyState> : (
          <ul className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {list.map((m) => (
              <li key={m.id} className="overflow-hidden rounded-lg border bg-background">
                {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
                <img src={urlOf(m.file_path)} alt={m.alt_text ?? ""} loading="lazy" className="aspect-square w-full bg-muted object-contain" />
                <div className="space-y-2 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><p className="truncate text-xs font-medium" title={m.original_name}>{m.original_name}</p><p className="text-[11px] text-muted-foreground">{Math.round(m.file_size / 1024)} KB</p></div>
                    <form action={deleteMedia}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="return_to" value={current} /><ConfirmButton message={`Remove ${m.original_name}?`} className={iconBtnDelete} title="Delete"><Trash2 className="size-4" aria-hidden="true" /></ConfirmButton></form>
                  </div>
                  <form action={saveAlt} className="flex gap-1.5">
                    <input type="hidden" name="id" value={m.id} /><input type="hidden" name="return_to" value={current} />
                    <input name="alt_text" defaultValue={m.alt_text ?? ""} placeholder="Alt text" aria-label={`Alt text for ${m.original_name}`} className={`${inputCls} py-1 text-xs`} />
                    <SubmitButton className={secondaryBtn}>Save</SubmitButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Pagination page={page} totalPages={pages(total)} total={total} perPage={perPage} hrefFor={(p) => `${BASE}?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`} />
      </Card>
    </AdminPage>
  );
}
