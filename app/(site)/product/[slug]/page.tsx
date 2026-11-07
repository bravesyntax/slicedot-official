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
import { getActiveProductSlugs, getProductBySlug, getProductCollections, getProductImages, getProductReviews, getBoughtTogether, getSimilarProducts, productColors } from "@/lib/catalog";
import { SITE_URL } from "@/lib/config";
import { buildMetadata, productSeoDefaults } from "@/lib/seo";
import SeoSchema from "@/components/SeoSchema";
import { RecentlyViewed, TrackView } from "@/components/product/RecentlyViewed";
import { FREE_SHIPPING_FROM, SHIPPING_FEE } from "@/lib/pricing";
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

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [gallery, collections, related, together, reviews, reviewSettings] = await Promise.all([
    getProductImages(product.id),
    getProductCollections(product.id),
    getSimilarProducts(product),
    getBoughtTogether(product.id),
    getProductReviews(product.id),
    getReviewSettings(),
  ]);

  const images = [
    ...(product.image ? [{ path: product.image, alt: product.name, color: null }] : []),
    ...gallery.filter((g) => g.image_path !== product.image).map((g) => ({ path: g.image_path, alt: g.alt_text || product.name, color: g.color_name || null })),
  ];
  const sizes = (product.size ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const specs: [string, string | null][] = [["SKU", product.sku], ["Material", product.material], ["Weight", product.weight], ["Dimensions", product.dimensions], ["Barcode", product.barcode]];
  const average = reviews.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : 0;

  return (
    <>
      <div className={`${container} py-5 sm:py-8`}>
        <div className="mb-5">
          <Crumbs items={[["Home", "/"], ["Products", "/products"], ...(product.category_name && product.category_slug ? [[product.category_name, categoryUrl(product.category_slug)] as [string, string]] : []), [product.name]]} />
        </div>
        <ProductView productId={product.id} name={product.name} price={product.price} comparePrice={product.compare_price} quantity={product.quantity} images={images} colors={productColors(product)} sizes={sizes}>
          {product.short_description && <p className="mt-6 text-muted-foreground">{product.short_description}</p>}
          {collections.length > 0 && <TagLinks title="Collections" links={collections.map((c) => [c.collection_name, `/products?collection=${encodeURIComponent(c.collection_slug)}`])} />}
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

      {together.length > 0 && (
        <Section label="Frequently bought together">
          <SectionHeading title="Frequently Bought Together" />
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {together.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </Section>
      )}

      {related.length > 0 && (
        <Section label="You may also like">
          <SectionHeading title="Similar Products" />
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {related.slice(0, 8).map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </Section>
      )}

      <TrackView product={{ id: product.id, slug: product.slug, name: product.name, price: product.price, image: product.image }} />
      <RecentlyViewed excludeId={product.id} className={`${container} pb-14`} />

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
            itemCondition: "https://schema.org/NewCondition",
            shippingDetails: {
              "@type": "OfferShippingDetails",
              shippingRate: { "@type": "MonetaryAmount", value: Number(product.price) >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE, currency: "INR" },
              shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
              deliveryTime: {
                "@type": "ShippingDeliveryTime",
                handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
                transitTime: { "@type": "QuantitativeValue", minValue: 3, maxValue: 7, unitCode: "DAY" },
              },
            },
            hasMerchantReturnPolicy: {
              "@type": "MerchantReturnPolicy",
              applicableCountry: "IN",
              returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
              merchantReturnDays: 7,
              returnMethod: "https://schema.org/ReturnByMail",
            },
          },
          // Only real, approved reviews.
          aggregateRating: reviews.length ? { "@type": "AggregateRating", ratingValue: average.toFixed(1), reviewCount: reviews.length } : undefined,
        }}
      />
      <SeoSchema type="product" entityKey={String(product.id)} />
    </>
  );
}
