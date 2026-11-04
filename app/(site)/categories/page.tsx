import { Package } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHero, container } from "@/components/site/ui";
import { BlurFade } from "@/components/velora/blur-fade";
import { getCategoryTree } from "@/lib/catalog";
import { categoryImage, categoryUrl, productImage } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Shop by Category",
  description: "Browse all product categories at SliceDot. Find exactly what you're looking for.",
  alternates: { canonical: "/categories" },
};

export default async function CategoriesPage() {
  const categories = await getCategoryTree();
  return (
    <>
      <PageHero eyebrow="Browse" title="Shop by Category">
        Explore our wide range of products organized by category. Find exactly what you&apos;re looking for.
      </PageHero>
      <section className={`${container} pb-14 sm:pb-24`} aria-label="All categories">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {categories.map((category, i) => {
            const image = category.image ? categoryImage(category.image) : category.sample_image ? productImage(category.sample_image) : null;
            return (
              <BlurFade key={category.id} delay={i * 0.03}>
                <Link href={categoryUrl(category.slug)} className="group relative block aspect-square overflow-hidden rounded-2xl border bg-muted">
                  {image && <Image src={image} alt={category.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />}
                  <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <span className="mb-1 inline-flex items-center gap-1 text-xs text-white/80"><Package className="size-3" aria-hidden="true" /> {category.product_count} items</span>
                    <h2 className="leading-tight font-semibold text-white underline-offset-4 group-hover:underline">{category.name}</h2>
                  </div>
                </Link>
              </BlurFade>
            );
          })}
        </div>
      </section>
    </>
  );
}
