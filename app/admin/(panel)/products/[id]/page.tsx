import { ExternalLink, Search } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { SubmitButton } from "@/components/admin/client";
import ImagePicker from "@/components/admin/ImagePicker";
import { AdminPage, BackLink, Card, inputCls, labelCls, primaryBtn, secondaryBtn, Toggle } from "@/components/admin/ui";
import { uploadMode } from "@/lib/admin/images";
import { rows, sql } from "@/lib/db";
import { productUrl } from "@/lib/routes";
import { saveProduct } from "../actions";

export const metadata = { title: "Edit product" };

type Product = {
  id: number; name: string; slug: string; sku: string | null; category_id: number | null; price: string; compare_price: string | null; cost_price: string | null; quantity: number | null; status: string; is_featured: number | null;
  short_description: string | null; description: string | null; material: string | null; size: string | null; weight: string | null; dimensions: string | null; barcode: string | null; vendor: string | null; product_type: string | null; product_tags: string | null;
  colors_json: string | null; color: string | null; image: string | null;
};

function Field({ name, label, value, hint, required, type = "text", step }: { name: string; label: string; value?: string | number | null; hint?: string; required?: boolean; type?: string; step?: string }) {
  return (
    <div>
      <label htmlFor={name} className={labelCls}>{label}</label>
      <input id={name} name={name} type={type} step={step} required={required} defaultValue={value ?? ""} className={inputCls} />
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

const Panel = ({ title, children }: { title: string; children: ReactNode }) => (
  <Card className="p-5"><h2 className="mb-4 text-sm font-semibold">{title}</h2>{children}</Card>
);

function colorLines(p: Product | null) {
  if (p?.colors_json) {
    try {
      return (JSON.parse(p.colors_json) as { name: string; code: string }[]).map((c) => `${c.name}, ${c.code}`).join("\n");
    } catch {
      // Malformed JSON from the old site: fall through to the single color column.
    }
  }
  return p?.color ?? "";
}

export default async function ProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "new";
  const productId = isNew ? 0 : Number(id);
  if (!isNew && !(productId > 0)) notFound();

  const [[product], categories, collections, chosen, gallery, tags] = await Promise.all([
    isNew ? Promise.resolve([] as Product[]) : rows<Product>(sql`SELECT * FROM products WHERE id = ${productId}`),
    rows<{ id: number; name: string; parent_id: number | null }>(sql`SELECT id, name, parent_id FROM categories ORDER BY sort_order, name`),
    rows<{ id: number; collection_name: string }>(sql`SELECT id, collection_name FROM product_collections ORDER BY sort_order, collection_name`),
    rows<{ collection_id: number }>(sql`SELECT collection_id FROM product_collection_map WHERE product_id = ${productId}`),
    rows<{ image_path: string; alt_text: string | null; color_name: string | null }>(sql`SELECT image_path, alt_text, color_name FROM product_images WHERE product_id = ${productId} ORDER BY sort_order, id`),
    rows<{ tag_name: string }>(sql`SELECT t.tag_name FROM product_seo_tags p JOIN seo_tags t ON t.id = p.tag_id WHERE p.product_id = ${productId} ORDER BY t.tag_name`),
  ]);
  if (!isNew && !product) notFound();
  const p = product ?? null;

  const images = [
    ...(p?.image && !gallery.some((g) => g.image_path === p.image) ? [{ path: p.image, alt: "", color: "" }] : []),
    ...gallery.map((g) => ({ path: g.image_path, alt: g.alt_text ?? "", color: g.color_name ?? "" })),
  ].sort((a, b) => Number(b.path === p?.image) - Number(a.path === p?.image));

  return (
    <AdminPage title={isNew ? "Add product" : p!.name}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <BackLink href="/admin/products">All products</BackLink>
        {p && (
          <div className="flex gap-2">
            <Link href={`/admin/seo/edit?type=product&key=${p.id}`} className={secondaryBtn}><Search className="size-3.5" aria-hidden="true" /> Edit SEO</Link>
            <a href={productUrl(p.slug)} target="_blank" rel="noopener noreferrer" className={secondaryBtn}><ExternalLink className="size-3.5" aria-hidden="true" /> View in store</a>
          </div>
        )}
      </div>
      <form action={saveProduct} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {p && <input type="hidden" name="id" value={p.id} />}
        <div className="min-w-0 space-y-6">
          <Panel title="Details">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2"><Field name="name" label="Name" value={p?.name} required /></div>
              <div className="md:col-span-2"><Field name="slug" label="URL" value={p?.slug} hint={p ? "Changing this adds a redirect from the old URL automatically." : "Leave empty to build it from the name."} /></div>
              <div className="md:col-span-2">
                <label htmlFor="short_description" className={labelCls}>Short description</label>
                <textarea id="short_description" name="short_description" rows={2} maxLength={500} defaultValue={p?.short_description ?? ""} className={`${inputCls} resize-y`} />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="description" className={labelCls}>Description</label>
                <textarea id="description" name="description" rows={8} defaultValue={p?.description ?? ""} className={`${inputCls} resize-y`} />
              </div>
            </div>
          </Panel>
          <Panel title="Images">
            <ImagePicker kind="products" mode={uploadMode()} name="images" initial={images} multiple details />
          </Panel>
          <Panel title="Pricing and stock">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field name="price" label="Price (₹)" value={p?.price} required type="number" step="0.01" />
              <Field name="compare_price" label="Compare-at (₹)" value={p?.compare_price} type="number" step="0.01" />
              <Field name="cost_price" label="Cost (₹)" value={p?.cost_price} type="number" step="0.01" />
              <Field name="quantity" label="Stock" value={p?.quantity ?? 0} required type="number" />
            </div>
          </Panel>
          <Panel title="Variants and specifications">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label htmlFor="colors" className={labelCls}>Colours</label>
                <textarea id="colors" name="colors" rows={3} defaultValue={colorLines(p)} placeholder={"Rose Gold, #b76e79\nSilver, #c0c0c0"} className={`${inputCls} resize-y font-mono text-xs`} />
                <p className="mt-1 text-[11px] text-muted-foreground">One per line: name, then its hex code.</p>
              </div>
              <Field name="size" label="Sizes" value={p?.size} hint="Comma separated." />
              <Field name="material" label="Material" value={p?.material} />
              <Field name="weight" label="Weight" value={p?.weight} />
              <Field name="dimensions" label="Dimensions" value={p?.dimensions} />
              <Field name="sku" label="SKU" value={p?.sku} />
              <Field name="barcode" label="Barcode" value={p?.barcode} />
            </div>
          </Panel>
        </div>
        <aside className="space-y-6 xl:sticky xl:top-20 xl:self-start">
          <Panel title="Publishing">
            <div className="space-y-4">
              <div>
                <label htmlFor="status" className={labelCls}>Status</label>
                <select id="status" name="status" defaultValue={p?.status === "inactive" ? "inactive" : "active"} className={inputCls}><option value="active">Active</option><option value="inactive">Inactive</option></select>
              </div>
              <Toggle name="is_featured" label="Featured on the home page" defaultChecked={!!p?.is_featured} />
              <SubmitButton className={`${primaryBtn} w-full`}>{p ? "Save product" : "Create product"}</SubmitButton>
            </div>
          </Panel>
          <Panel title="Organisation">
            <div className="space-y-4">
              <div>
                <label htmlFor="category_id" className={labelCls}>Category</label>
                <select id="category_id" name="category_id" defaultValue={p?.category_id ?? ""} className={inputCls}>
                  <option value="">None</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.parent_id ? `— ${c.name}` : c.name}</option>)}
                </select>
              </div>
              <Field name="vendor" label="Brand" value={p?.vendor} />
              <Field name="product_type" label="Type" value={p?.product_type} />
              <Field name="product_tags" label="Tags" value={p?.product_tags} hint="Comma separated. Shown on the product page." />
              <div>
                <label htmlFor="keywords" className={labelCls}>Related keywords</label>
                <textarea id="keywords" name="keywords" rows={3} defaultValue={tags.map((t) => t.tag_name).join(", ")} className={`${inputCls} resize-y`} />
                <p className="mt-1 text-[11px] text-muted-foreground">Comma separated, up to 30. Linked to searches from the product page.</p>
              </div>
              {collections.length > 0 && (
                <fieldset>
                  <legend className={labelCls}>Collections</legend>
                  <div className="space-y-1.5">
                    {collections.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="collections" value={c.id} defaultChecked={chosen.some((x) => x.collection_id === c.id)} className="accent-primary" /> {c.collection_name}</label>
                    ))}
                  </div>
                </fieldset>
              )}
            </div>
          </Panel>
        </aside>
      </form>
    </AdminPage>
  );
}
