import type { Metadata } from "next";
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
  return {
    title: category.meta_title || category.name,
    description: category.meta_description || category.description || `Shop ${category.name} at SliceDot.`,
    keywords: category.keywords || undefined,
    alternates: { canonical: categoryUrl(category.slug) },
  };
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
    <ProductListing
      searchParams={await searchParams}
      basePath={categoryUrl(category.slug)}
      title={category.name}
      description={category.description}
      category={category}
      crumbs={[["Home", "/"], ["Products", "/products"], ...trail, [category.name]]}
    />
  );
}
