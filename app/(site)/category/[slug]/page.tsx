import type { Metadata } from "next";
import SeoSchema from "@/components/SeoSchema";
import { buildMetadata, categorySeoDefaults } from "@/lib/seo";
import { notFound } from "next/navigation";
import ProductListing from "@/components/catalog/ProductListing";
import { getCategoryBySlug, getCategoryTree } from "@/lib/catalog";
import type { SearchParams } from "@/lib/listing";
import { categoryUrl } from "@/lib/routes";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};
  return buildMetadata("category", String(category.id), categorySeoDefaults(category));
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  // Parents first, for the breadcrumb.
  const tree = await getCategoryTree();
  const trail: [string, string?][] = [];
  for (let parent = tree.find((c) => c.id === category.parent_id); parent; parent = tree.find((c) => c.id === parent!.parent_id)) {
    trail.unshift([parent.name, categoryUrl(parent.slug)]);
  }

  return (
    <>
    <ProductListing
      searchParams={await searchParams}
      basePath={categoryUrl(category.slug)}
      title={category.name}
      description={category.description}
      category={category}
      crumbs={[["Home", "/"], ["Products", "/products"], ...trail, [category.name]]}
    />
    <SeoSchema type="category" entityKey={String(category.id)} />
    </>
  );
}
