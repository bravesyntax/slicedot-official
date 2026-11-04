import { Pencil, Trash2 } from "lucide-react";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ConfirmButton, SubmitButton } from "@/components/admin/client";
import { Pill } from "@/components/admin/SeoShell";
import { AdminPage, Card, CardHead, EmptyState, iconBtnDelete, iconBtnEdit, inputCls, labelCls, smallPrimaryBtn, Th, Toggle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { checkbox, finish, intField, makeSlug, refreshPublicSite } from "@/lib/admin/common";
import { rows, sql } from "@/lib/db";
import { field } from "@/lib/validation";

export const metadata = { title: "Collections" };

const LIST = "/admin/collections";
type Collection = { id: number; collection_name: string; collection_slug: string; description: string | null; sort_order: number | null; status: string; products: number };
type Props = { searchParams: Promise<{ edit?: string }> };

async function saveCollection(fd: FormData) {
  "use server";
  await requireAdmin();
  const id = intField(fd, "id");
  const name = field(fd, "collection_name").slice(0, 255);
  const slug = makeSlug(field(fd, "collection_slug") || name);
  if (!slug) await finish("error", "Enter the collection name.", LIST);
  const [taken] = await rows<{ id: number }>(sql`SELECT id FROM product_collections WHERE collection_slug = ${slug} AND id <> ${id} LIMIT 1`);
  if (taken) await finish("error", `The URL "${slug}" is already used.`, LIST);
  const values = { collection_name: name, collection_slug: slug, description: field(fd, "description") || null, sort_order: intField(fd, "sort_order"), status: checkbox(fd, "is_active") ? "active" : "inactive" };
  if (id) await sql`UPDATE product_collections SET ${sql(values)} WHERE id = ${id}`;
  else await sql`INSERT INTO product_collections ${sql(values)}`;
  refreshPublicSite();
  revalidatePath(LIST);
  await finish("success", "Collection saved.", LIST);
}

async function deleteCollection(fd: FormData) {
  "use server";
  await requireAdmin();
  const id = intField(fd, "id");
  await sql.begin(async (tx) => {
    await tx`DELETE FROM product_collection_map WHERE collection_id = ${id}`;
    await tx`DELETE FROM product_collections WHERE id = ${id}`;
  });
  refreshPublicSite();
  await finish("success", "Collection deleted. Its products are unchanged.", LIST);
}

export default async function CollectionsPage({ searchParams }: Props) {
  const { edit } = await searchParams;
  const list = await rows<Collection>(sql`
    SELECT c.id, c.collection_name, c.collection_slug, c.description, c.sort_order, c.status, (SELECT COUNT(*)::int FROM product_collection_map m WHERE m.collection_id = c.id) AS products
    FROM product_collections c ORDER BY c.sort_order, c.collection_name
  `);
  const editing = list.find((c) => c.id === Number(edit)) ?? null;

  return (
    <AdminPage title="Collections">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHead title="All collections" description="Groups of products across categories. Pick products from each product's edit screen." />
          {list.length === 0 ? <EmptyState>No collections yet.</EmptyState> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr><Th>Collection</Th><Th className="text-right">Products</Th><Th>Status</Th><Th /></tr></thead>
                <tbody className="divide-y">
                  {list.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3"><div className="font-medium">{c.collection_name}</div><div className="text-xs text-muted-foreground">{c.collection_slug}</div></td>
                      <td className="px-4 py-3 text-right">{c.products}</td>
                      <td className="px-4 py-3"><Pill tone={c.status === "active" ? "ok" : "muted"}>{c.status === "active" ? "Active" : "Inactive"}</Pill></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Link href={`${LIST}?edit=${c.id}`} className={iconBtnEdit} title="Edit" aria-label={`Edit ${c.collection_name}`}><Pencil className="size-4" aria-hidden="true" /></Link>
                          <form action={deleteCollection}><input type="hidden" name="id" value={c.id} /><ConfirmButton message={`Delete the collection "${c.collection_name}"?`} className={iconBtnDelete} title="Delete"><Trash2 className="size-4" aria-hidden="true" /></ConfirmButton></form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card className="h-fit p-5">
          <h2 className="font-semibold">{editing ? "Edit collection" : "Add a collection"}</h2>
          <form key={editing?.id ?? "new"} action={saveCollection} className="mt-4 space-y-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div><label htmlFor="collection_name" className={labelCls}>Name</label><input id="collection_name" name="collection_name" required defaultValue={editing?.collection_name} className={inputCls} /></div>
            <div><label htmlFor="collection_slug" className={labelCls}>URL name</label><input id="collection_slug" name="collection_slug" defaultValue={editing?.collection_slug} className={inputCls} /></div>
            <div><label htmlFor="description" className={labelCls}>Description</label><textarea id="description" name="description" rows={3} defaultValue={editing?.description ?? ""} className={inputCls} /></div>
            <div><label htmlFor="sort_order" className={labelCls}>Order</label><input id="sort_order" name="sort_order" type="number" defaultValue={editing?.sort_order ?? 0} className={inputCls} /></div>
            <Toggle name="is_active" label="Active" defaultChecked={editing ? editing.status === "active" : true} />
            <div className="flex items-center gap-3">
              <SubmitButton className={smallPrimaryBtn}>{editing ? "Update" : "Add collection"}</SubmitButton>
              {editing && <Link href={LIST} className="text-xs text-muted-foreground hover:text-foreground">Cancel</Link>}
            </div>
          </form>
        </Card>
      </div>
    </AdminPage>
  );
}
