import { buildMetadata, pageDefaults } from "@/lib/seo";
import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import ProductListing from "@/components/catalog/ProductListing";
import { getCategoryBySlug } from "@/lib/catalog";
import { queryWith, type SearchParams } from "@/lib/listing";
import { categoryUrl } from "@/lib/routes";

type Props = { searchParams: Promise<SearchParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { search } = await searchParams;
  const meta = await buildMetadata("page", "products", pageDefaults("products"), { forceNoindex: !!search });
  // Search results are endless and thin; links on them still count.
  return search ? { ...meta, title: `Search: ${String(search).slice(0, 60)}` } : meta;
}

export default async function ProductsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const rest = { ...sp };
  delete rest.category;
  // Old ?category= links move to the clean URL. As on the PHP site, an unknown category just lists everything.
  if (typeof sp.category === "string" && (await getCategoryBySlug(sp.category))) {
    permanentRedirect(`${categoryUrl(sp.category)}${queryWith(rest, {})}`);
  }
  return <ProductListing searchParams={rest} basePath="/products" title="All Products" crumbs={[["Home", "/"], ["Products"]]} />;
}
