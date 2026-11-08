import { ExternalLink, Pencil, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { ConfirmButton, SubmitButton } from "@/components/admin/client";
import { AiCategoryWriter } from "@/components/admin/AiTools";
import ImagePicker from "@/components/admin/ImagePicker";
import SeoBasicsPanel from "@/components/admin/SeoBasicsPanel";
import { Pill } from "@/components/admin/SeoShell";
import { AdminPage, Card, CardHead, EmptyState, iconBtnDelete, iconBtnEdit, iconBtnView, inputCls, labelCls, smallPrimaryBtn, Th, Toggle } from "@/components/admin/ui";
import { uploadMode } from "@/lib/admin/images";
import { loadSeoBasics } from "@/lib/admin/seo-basics";
import { aiConfigured } from "@/lib/ai";
import { aiSeoCopy } from "../ai-actions";
import { rows, sql } from "@/lib/db";
import { categoryImage, categoryUrl } from "@/lib/routes";
import { deleteCategory, saveCategory } from "./actions";

export const metadata = { title: "Categories" };

type Category = { id: number; parent_id: number | null; name: string; slug: string; description: string | null; image: string | null; image_alt: string | null; sort_order: number | null; status: string; products: number };
type Props = { searchParams: Promise<{ edit?: string }> };

export default async function CategoriesPage({ searchParams }: Props) {
  const { edit } = await searchParams;
  const all = await rows<Category>(sql`
    SELECT c.id, c.parent_id, c.name, c.slug, c.description, c.image, c.image_alt, c.sort_order, c.status, (SELECT COUNT(*)::int FROM products p WHERE p.category_id = c.id) AS products
    FROM categories c ORDER BY c.sort_order, c.name
  `);
  // Parents with their children straight after them.
  const ordered: (Category & { depth: number })[] = [];
  const walk = (parent: number | null, depth: number) => all.filter((c) => c.parent_id === parent).forEach((c) => { ordered.push({ ...c, depth }); walk(c.id, depth + 1); });
  walk(null, 0);
  const orphans = all.filter((c) => !ordered.some((o) => o.id === c.id)).map((c) => ({ ...c, depth: 0 }));
  const list = [...ordered, ...orphans];
  const editing = list.find((c) => c.id === Number(edit)) ?? null;
  const seo = await loadSeoBasics("category", editing ? String(editing.id) : null);

  return (
    <AdminPage title="Categories">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHead title="All categories" description={`${list.length} total`} />
          {list.length === 0 ? <EmptyState>No categories yet.</EmptyState> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr><Th>Category</Th><Th className="text-right">Products</Th><Th className="text-right">Order</Th><Th>Status</Th><Th /></tr></thead>
                <tbody className="divide-y">
                  {list.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-2.5">
                        <div className="flex min-w-48 items-center gap-3" style={{ paddingLeft: c.depth * 20 }}>
                          {c.image ? (
                            // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
                            <img src={categoryImage(c.image)} alt="" className="size-9 shrink-0 rounded-md bg-muted object-cover" />
                          ) : <span className="size-9 shrink-0 rounded-md bg-muted" />}
                          <span className="min-w-0"><span className="block truncate font-medium">{c.name}</span><span className="block truncate text-xs text-muted-foreground">{c.slug}</span></span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right">{c.products}</td>
                      <td className="px-4 py-2.5 text-right text-xs">{c.sort_order ?? 0}</td>
                      <td className="px-4 py-2.5"><Pill tone={c.status === "active" ? "ok" : "muted"}>{c.status === "active" ? "Active" : "Inactive"}</Pill></td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-1">
                          <Link href={`/admin/categories?edit=${c.id}`} className={iconBtnEdit} title="Edit" aria-label={`Edit ${c.name}`}><Pencil className="size-4" aria-hidden="true" /></Link>
                          <Link href={`/admin/seo/edit?type=category&key=${c.id}`} className={iconBtnView} title="SEO" aria-label={`SEO for ${c.name}`}><Search className="size-4" aria-hidden="true" /></Link>
                          <a href={categoryUrl(c.slug)} target="_blank" rel="noopener noreferrer" className={iconBtnView} title="View in store" aria-label={`View ${c.name}`}><ExternalLink className="size-4" aria-hidden="true" /></a>
                          <form action={deleteCategory}><input type="hidden" name="id" value={c.id} /><ConfirmButton message={`Delete the category "${c.name}"?`} className={iconBtnDelete} title="Delete"><Trash2 className="size-4" aria-hidden="true" /></ConfirmButton></form>
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
          <h2 className="font-semibold">{editing ? `Edit ${editing.name}` : "Add a category"}</h2>
          <form key={editing?.id ?? "new"} action={saveCategory} className="mt-4 space-y-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            {aiConfigured() && <AiCategoryWriter categoryId={editing?.id ?? null} />}
            <div><label htmlFor="name" className={labelCls}>Name</label><input id="name" name="name" required maxLength={100} defaultValue={editing?.name} className={inputCls} /></div>
            <div><label htmlFor="slug" className={labelCls}>URL</label><input id="slug" name="slug" maxLength={100} defaultValue={editing?.slug} className={inputCls} /><p className="mt-1 text-[11px] text-muted-foreground">{editing ? "Changing this adds a redirect from the old URL." : "Leave empty to build it from the name."}</p></div>
            <div>
              <label htmlFor="parent_id" className={labelCls}>Parent</label>
              <select id="parent_id" name="parent_id" defaultValue={editing?.parent_id ?? ""} className={inputCls}>
                <option value="">None (top level)</option>
                {list.filter((c) => c.id !== editing?.id).map((c) => <option key={c.id} value={c.id}>{`${"— ".repeat(c.depth)}${c.name}`}</option>)}
              </select>
            </div>
            <div><label htmlFor="description" className={labelCls}>Description</label><textarea id="description" name="description" rows={3} defaultValue={editing?.description ?? ""} className={`${inputCls} resize-y`} /></div>
            <div>
              <span className={labelCls}>Image</span>
              <ImagePicker kind="categories" mode={uploadMode()} name="image" initial={editing?.image ? [{ path: editing.image, alt: "", color: "" }] : []} />
            </div>
            <div><label htmlFor="image_alt" className={labelCls}>Image alt text</label><input id="image_alt" name="image_alt" defaultValue={editing?.image_alt ?? ""} className={inputCls} /></div>
            <div><label htmlFor="sort_order" className={labelCls}>Order</label><input id="sort_order" name="sort_order" type="number" defaultValue={editing?.sort_order ?? 0} className={inputCls} /></div>
            <div className="rounded-xl border p-4">
              <h3 className="mb-3 text-sm font-semibold">Search engine listing</h3>
              <SeoBasicsPanel {...seo} compact pathPrefix="/category/" slug={editing?.slug ?? ""} editHref={editing ? `/admin/seo/edit?type=category&key=${editing.id}` : undefined} suggest={editing && aiConfigured() ? aiSeoCopy.bind(null, "category", String(editing.id)) : undefined} />
            </div>
            <Toggle name="is_active" label="Active" defaultChecked={editing ? editing.status === "active" : true} />
            <div className="flex items-center gap-3">
              <SubmitButton className={smallPrimaryBtn}>{editing ? "Update" : "Add category"}</SubmitButton>
              {editing && <Link href="/admin/categories" className="text-xs text-muted-foreground hover:text-foreground">Cancel</Link>}
            </div>
          </form>
        </Card>
      </div>
    </AdminPage>
  );
}
