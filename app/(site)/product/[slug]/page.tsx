import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Crumbs from "@/components/catalog/Crumbs";
import JsonLd from "@/components/JsonLd";
import ProductCard from "@/components/home/ProductCard";
import ProductView from "@/components/product/ProductView";
import ReviewSection from "@/components/product/ReviewSection";
import { Section, SectionHeading, container } from "@/components/site/ui";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getActiveProductSlugs, getProductBySlug, getProductCollections, getProductImages, getProductReviews, getProductSeoTags, getRelatedProducts, getTrendingSearches, productColors } from "@/lib/catalog";
import { SITE_URL } from "@/lib/config";
import { buildMetadata, productSeoDefaults } from "@/lib/seo";
import SeoSchema from "@/components/SeoSchema";
import { categoryUrl, productImage, productUrl } from "@/lib/routes";
import { getReviewSettings } from "@/lib/settings";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getActiveProductSlugs();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  return buildMetadata("product", String(product.id), productSeoDefaults(product));
}

const TagLinks = ({ title, links }: { title: string; links: [string, string][] }) => (
  <div className="mt-5">
    <p className="text-sm font-medium">{title}</p>
    <div className="mt-2 flex flex-wrap gap-1.5">
      {links.map(([label, href]) => (
        <Link key={label} href={href} className="rounded-full border bg-card px-3 py-1 text-xs transition-colors hover:border-primary hover:text-primary">{label}</Link>
      ))}
    </div>
  </div>
);

const search = (term: string) => `/products?search=${encodeURIComponent(term)}`;

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [gallery, seoTags, collections, related, trending, reviews, reviewSettings] = await Promise.all([
    getProductImages(product.id),
    getProductSeoTags(product.id),
    getProductCollections(product.id),
    getRelatedProducts(product.id, product.category_id),
    getTrendingSearches(),
    getProductReviews(product.id),
    getReviewSettings(),
  ]);

  const images = [
    ...(product.image ? [{ path: product.image, alt: product.name, color: null }] : []),
    ...gallery.filter((g) => g.image_path !== product.image).map((g) => ({ path: g.image_path, alt: g.alt_text || product.name, color: g.color_name || null })),
  ];
  const tags = (product.product_tags ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  const sizes = (product.size ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const specs: [string, string | null][] = [["SKU", product.sku], ["Material", product.material], ["Weight", product.weight], ["Dimensions", product.dimensions], ["Barcode", product.barcode]];
  const average = reviews.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : 0;

  return (
    <>
      <div className={`${container} py-6 sm:py-10`}>
        <div className="mb-6">
          <Crumbs items={[["Home", "/"], ["Products", "/products"], ...(product.category_name && product.category_slug ? [[product.category_name, categoryUrl(product.category_slug)] as [string, string]] : []), [product.name]]} />
        </div>
        <ProductView productId={product.id} name={product.name} price={product.price} comparePrice={product.compare_price} quantity={product.quantity} images={images} colors={productColors(product)} sizes={sizes}>
          {product.short_description && <p className="mt-6 text-muted-foreground">{product.short_description}</p>}
          {tags.length > 0 && <TagLinks title="Tags" links={tags.map((t) => [t, `/products?tag=${encodeURIComponent(t)}`])} />}
          {collections.length > 0 && <TagLinks title="Collections" links={collections.map((c) => [c.collection_name, `/products?collection=${encodeURIComponent(c.collection_slug)}`])} />}
          {seoTags.length > 0 && <TagLinks title="Related Keywords" links={seoTags.map((t) => [t.tag_name, search(t.tag_name)])} />}
          <Accordion type="single" collapsible defaultValue="description" className="mt-6">
            <AccordionItem value="description">
              <AccordionTrigger>Description</AccordionTrigger>
              <AccordionContent className="whitespace-pre-line text-muted-foreground">{product.description || "No description available."}</AccordionContent>
            </AccordionItem>
            <AccordionItem value="specifications">
              <AccordionTrigger>Specifications</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <dl className="grid gap-1.5">
                  {specs.filter(([, value]) => value).map(([label, value]) => (
                    <div key={label} className="flex gap-2"><dt className="font-medium text-foreground">{label}:</dt> <dd>{value}</dd></div>
                  ))}
                </dl>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="shipping">
              <AccordionTrigger>Shipping &amp; Returns</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p>Free shipping on orders above ₹499, delivered across India in 3–7 business days. <Link href="/shipping" className="underline underline-offset-4">Shipping details</Link></p>
                <p className="mt-2">Easy returns within 7 days of delivery, for unused items in original packaging. <Link href="/returns" className="underline underline-offset-4">Returns policy</Link></p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </ProductView>
      </div>

      <Section muted label="Customer reviews">
        <ReviewSection
          productId={product.id}
          enabled={reviewSettings.enabled}
          minLength={reviewSettings.minLength}
          reviews={reviews.map((r) => ({
            id: r.id,
            customer_name: r.customer_name,
            rating: r.rating,
            title: r.title,
            review_text: r.review_text,
            verified: r.verified_purchase === 1,
            helpful: r.helpful_count ?? 0,
            reply: r.admin_reply,
            date: new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }),
          }))}
        />
      </Section>

      {related.length > 0 && (
        <Section label="You may also like">
          <SectionHeading title="You May Also Like" />
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </Section>
      )}

      {trending.length > 0 && (
        <section className={`${container} pb-14`} aria-label="Trending searches">
          <p className="text-sm font-medium text-muted-foreground">Trending searches</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {trending.map((t) => (
              <Link key={t.search_term} href={search(t.search_term)} className="rounded-full border bg-card px-3 py-1.5 text-xs transition-colors hover:border-primary hover:text-primary">{t.search_term}</Link>
            ))}
          </div>
        </section>
      )}

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.meta_description || product.short_description || undefined,
          sku: product.sku || undefined,
          image: images.map((i) => new URL(productImage(i.path), SITE_URL).href),
          brand: product.vendor ? { "@type": "Brand", name: product.vendor } : undefined,
          offers: {
            "@type": "Offer",
            url: `${SITE_URL}${productUrl(product.slug)}`,
            priceCurrency: "INR",
            price: Number(product.price),
            availability: product.quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          },
          // Only real, approved reviews.
          aggregateRating: reviews.length ? { "@type": "AggregateRating", ratingValue: average.toFixed(1), reviewCount: reviews.length } : undefined,
        }}
      />
      <SeoSchema type="product" entityKey={String(product.id)} />
    </>
  );
}
