import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { ConfirmButton, SubmitButton } from "@/components/admin/client";
import { Pill } from "@/components/admin/SeoShell";
import { AdminPage, Card, CardHead, EmptyState, iconBtnDelete, iconBtnEdit, inputCls, labelCls, smallPrimaryBtn, Toggle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { finish, intField, makeSlug, refreshPublicSite } from "@/lib/admin/common";
import { rows, sql } from "@/lib/db";
import { field, isValidHttpUrl } from "@/lib/validation";

export const metadata = { title: "Navigation" };

const LIST = "/admin/navigation";
const MENU_TYPES = ["main", "mega", "submenu"];
type Item = { id: number; parent_id: number | null; title: string; slug: string; url: string | null; category_id: number | null; menu_type: string; level: number | null; sort_order: number | null; status: string };

const orderItems = (all: Item[]) => {
  const out: (Item & { depth: number })[] = [];
  const walk = (parent: number | null, depth: number) => all.filter((i) => i.parent_id === parent).forEach((i) => { out.push({ ...i, depth }); walk(i.id, depth + 1); });
  walk(null, 0);
  return out;
};
const loadItems = () => rows<Item>(sql`SELECT id, parent_id, title, slug, url, category_id, menu_type, level, sort_order, status FROM navigation_items ORDER BY sort_order, id`);

async function saveItem(fd: FormData) {
  "use server";
  await requireAdmin();
  const id = intField(fd, "id");
  const back = id ? `${LIST}?edit=${id}` : LIST;
  const title = field(fd, "title").slice(0, 100);
  if (!title) await finish("error", "Enter the menu title.", back);
  const url = field(fd, "url").slice(0, 255) || null;
  if (url && !(url.startsWith("/") && !url.startsWith("//")) && !isValidHttpUrl(url)) await finish("error", "Link must be a path on this site (/products) or a full https:// link.", back);
  const all = await loadItems();
  const parentId = intField(fd, "parent_id") || null;
  for (let p = parentId; p; p = all.find((i) => i.id === p)?.parent_id ?? null) if (p === id) await finish("error", "A menu item can't be placed under itself.", back);
  const parent = all.find((i) => i.id === parentId);
  const values = {
    title, slug: makeSlug(title).slice(0, 100) || `item-${Date.now()}`, url, parent_id: parentId, category_id: intField(fd, "category_id") || null,
    menu_type: MENU_TYPES.includes(field(fd, "menu_type")) ? field(fd, "menu_type") : "main", level: (parent?.level ?? 0) + 1, sort_order: intField(fd, "sort_order"), status: fd.get("is_active") ? "active" : "inactive",
  };
  if (id) await sql`UPDATE navigation_items SET ${sql(values)}, updated_at = LOCALTIMESTAMP WHERE id = ${id}`;
  else await sql`INSERT INTO navigation_items ${sql(values)}`;
  refreshPublicSite();
  await finish("success", "Menu saved.", LIST);
}

async function deleteItem(fd: FormData) {
  "use server";
  await requireAdmin();
  const id = intField(fd, "id");
  const [{ n }] = await rows<{ n: number }>(sql`SELECT COUNT(*)::int AS n FROM navigation_items WHERE parent_id = ${id}`);
  if (n) await finish("error", `This item has ${n} items under it. Move or delete them first.`, LIST);
  await sql`DELETE FROM navigation_items WHERE id = ${id}`;
  refreshPublicSite();
  await finish("success", "Menu item deleted.", LIST);
}

type Props = { searchParams: Promise<{ edit?: string }> };

export default async function NavigationPage({ searchParams }: Props) {
  const { edit } = await searchParams;
  const [all, categories] = await Promise.all([loadItems(), rows<{ id: number; name: string }>(sql`SELECT id, name FROM categories ORDER BY name`)]);
  const list = orderItems(all);
  const editing = list.find((i) => i.id === Number(edit)) ?? null;

  return (
    <AdminPage title="Navigation">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHead title="Store menu" description={`${list.length} items. Changes show in the store header.`} />
          {list.length === 0 ? <EmptyState>No menu items yet.</EmptyState> : (
            <ul className="divide-y">
              {list.map((i) => (
                <li key={i.id} className={`flex items-center gap-3 px-5 py-2.5 ${i.status === "active" ? "" : "opacity-60"}`}>
                  <div className="min-w-0 flex-1" style={{ paddingLeft: i.depth * 20 }}>
                    <span className="text-sm font-medium">{i.title}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{i.url || (i.category_id ? categories.find((c) => c.id === i.category_id)?.name : "")}</span>
                  </div>
                  <Pill tone="muted">{i.menu_type}</Pill>
                  <span className="w-6 text-right text-xs text-muted-foreground">{i.sort_order ?? 0}</span>
                  <div className="flex gap-1">
                    <Link href={`${LIST}?edit=${i.id}`} className={iconBtnEdit} title="Edit" aria-label={`Edit ${i.title}`}><Pencil className="size-4" aria-hidden="true" /></Link>
                    <form action={deleteItem}><input type="hidden" name="id" value={i.id} /><ConfirmButton message={`Delete "${i.title}" from the menu?`} className={iconBtnDelete} title="Delete"><Trash2 className="size-4" aria-hidden="true" /></ConfirmButton></form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="h-fit p-5">
          <h2 className="font-semibold">{editing ? "Edit menu item" : "Add a menu item"}</h2>
          <form key={editing?.id ?? "new"} action={saveItem} className="mt-4 space-y-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div><label htmlFor="title" className={labelCls}>Title</label><input id="title" name="title" required maxLength={100} defaultValue={editing?.title} className={inputCls} /></div>
            <div>
              <label htmlFor="category_id" className={labelCls}>Links to category</label>
              <select id="category_id" name="category_id" defaultValue={editing?.category_id ?? ""} className={inputCls}><option value="">None</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            </div>
            <div><label htmlFor="url" className={labelCls}>Or link to</label><input id="url" name="url" defaultValue={editing?.url ?? ""} placeholder="/products" className={inputCls} /></div>
            <div>
              <label htmlFor="parent_id" className={labelCls}>Under</label>
              <select id="parent_id" name="parent_id" defaultValue={editing?.parent_id ?? ""} className={inputCls}><option value="">Top level</option>{list.filter((i) => i.id !== editing?.id).map((i) => <option key={i.id} value={i.id}>{`${"— ".repeat(i.depth)}${i.title}`}</option>)}</select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label htmlFor="menu_type" className={labelCls}>Type</label><select id="menu_type" name="menu_type" defaultValue={editing?.menu_type ?? "main"} className={inputCls}>{MENU_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
              <div><label htmlFor="sort_order" className={labelCls}>Order</label><input id="sort_order" name="sort_order" type="number" defaultValue={editing?.sort_order ?? 0} className={inputCls} /></div>
            </div>
            <Toggle name="is_active" label="Active" defaultChecked={editing ? editing.status === "active" : true} />
            <div className="flex items-center gap-3">
              <SubmitButton className={smallPrimaryBtn}>{editing ? "Update" : "Add item"}</SubmitButton>
              {editing && <Link href={LIST} className="text-xs text-muted-foreground hover:text-foreground">Cancel</Link>}
            </div>
          </form>
        </Card>
      </div>
    </AdminPage>
  );
}
