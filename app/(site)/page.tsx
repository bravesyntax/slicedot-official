import { ArrowRight, BadgePercent, Banknote, RefreshCw, ShieldCheck, Sparkles, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import ProductCard from "@/components/home/ProductCard";
import Slider from "@/components/home/Slider";
import SeoSchema from "@/components/SeoSchema";
import { container } from "@/components/site/ui";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BlurFade } from "@/components/velora/blur-fade";
import { getCategoryProducts, getCategoryTree, getDealProducts, getFeaturedProducts, getHomeFaqs, getLatestProducts, getRootCategories, getTrendingProducts, type ProductCard as Product } from "@/lib/catalog";
import { SITE_URL } from "@/lib/config";
import { categoryImage, categoryUrl, productImage } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";
import { getSeoSettings, getStoreSettings } from "@/lib/settings";

export const revalidate = 300;

const TRUST = [
  { icon: Truck, title: "Free shipping", text: "On orders of ₹499 and above" },
  { icon: RefreshCw, title: "Easy returns", text: "Within 7 days of delivery" },
  { icon: Banknote, title: "Cash on Delivery", text: "Pay when it arrives" },
  { icon: ShieldCheck, title: "Secure payments", text: "UPI, cards and net banking" },
];
const BUDGETS = [
  { label: "Under ₹500", href: "/products?price=0-500", tint: "bg-rose-50 dark:bg-rose-950/40" },
  { label: "₹500 to ₹1,000", href: "/products?price=500-1000", tint: "bg-amber-50 dark:bg-amber-950/40" },
  { label: "₹1,000 to ₹2,000", href: "/products?price=1000-2000", tint: "bg-sky-50 dark:bg-sky-950/40" },
];
const FALLBACK_FAQS = [
  { question: "What types of products are available at SliceDot?", answer: "SliceDot offers hair accessories, phone essentials, kitchen gadgets, jewelry, perfumes, home decor, and lifestyle products at affordable prices." },
  { question: "How can I track my order?", answer: "Once shipped, you'll receive a tracking number via email and SMS. Track your delivery on our website or the courier's tracking page." },
  { question: "What is the return policy?", answer: "We offer a 7-day hassle-free return policy. Products must be unused and in original packaging." },
  { question: "Is Cash on Delivery available?", answer: "Yes, COD is available for most locations. You can also pay via Cards, UPI, Net Banking, or digital wallets." },
  { question: "How long does delivery take?", answer: "Standard delivery: 3–7 business days. Metro cities: 3–5 days. Express options available for select locations." },
  { question: "Are the products genuine?", answer: "Absolutely. All products are sourced from trusted manufacturers and undergo quality checks before listing." },
];

export const generateMetadata = () => pageMetadata("home");

function Shelf({ title, subtitle, href, children, muted }: { title: string; subtitle?: string; href?: string; children: React.ReactNode; muted?: boolean }) {
  return (
    <section aria-label={title} className={muted ? "bg-muted/40 py-10 sm:py-14 dark:bg-muted/20" : "py-10 sm:py-14"}>
      <div className={container}>
        <div className="mb-6 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {href && (
            <Link href={href} className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline">
              View all <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}

const ProductGrid = ({ products, badge }: { products: Product[]; badge?: "discount" | "trending" | "new" }) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
    {products.map((product, i) => (
      <BlurFade key={product.id} delay={i * 0.03} className="h-full"><ProductCard product={product} badge={badge} showSold={badge === "trending"} /></BlurFade>
    ))}
  </div>
);

export default async function HomePage() {
  const [store, seo, categories, tree, deals, featured, trending, latest, dbFaqs] = await Promise.all([
    getStoreSettings(),
    getSeoSettings(),
    getRootCategories(),
    getCategoryTree(),
    getDealProducts(),
    getFeaturedProducts(),
    getTrendingProducts(),
    getLatestProducts(),
    getHomeFaqs(),
  ]);
  // seo_faq can hold the same question for both page = 'homepage' and page = 'all'.
  const faqs = dbFaqs.length ? dbFaqs.filter((faq, i) => dbFaqs.findIndex((f) => f.question === faq.question) === i) : FALLBACK_FAQS;
  const rail = tree.filter((c) => c.product_count > 0).slice(0, 10);
  const showcases = await Promise.all(
    categories.filter((c) => c.product_count >= 2).map(async (category) => ({ category, products: await getCategoryProducts(category.id, 4) })),
  );
  const heroProducts = (featured.length >= 3 ? featured : latest).filter((p) => p.image).slice(0, 3);
  const biggestDeal = deals.reduce((best, p) => Math.max(best, Math.round((1 - Number(p.price) / Number(p.compare_price)) * 100)), 0);
  const bestsellers = trending.filter((p) => (p.total_sold ?? 0) > 0);

  return (
    <>
      <section className={`${container} pt-4 sm:pt-6`} aria-label="Highlights">
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-3 lg:grid-rows-2">
          <div className="relative isolate flex flex-col justify-between gap-8 overflow-hidden rounded-3xl bg-neutral-950 p-6 text-white sm:flex-row sm:items-center sm:gap-6 sm:p-10 lg:col-span-2 lg:row-span-2">
            <div aria-hidden="true" className="absolute -top-24 -right-24 -z-10 size-96 rounded-full bg-white/10 blur-3xl" />
            <div className="max-w-md min-w-0 sm:flex-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium"><Sparkles className="size-3.5" aria-hidden="true" /> New styles every week</span>
              <h1 className="mt-5 text-4xl leading-[1.05] font-semibold tracking-tight text-balance xl:text-5xl">Everything you need, all in one place</h1>
              <p className="mt-4 text-pretty text-white/70">Jewellery, beauty, home and phone essentials at prices that make sense, delivered across India.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/products" className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-medium text-neutral-950 transition-opacity hover:opacity-90">Shop now <ArrowRight className="size-4" aria-hidden="true" /></Link>
                <Link href="/products?sort=discount&discount=10" className="inline-flex h-11 items-center rounded-full border border-white/30 px-6 text-sm font-medium transition-colors hover:bg-white/10">See deals</Link>
              </div>
            </div>
            <div className="flex shrink-0 gap-3 sm:grid sm:grid-cols-2" aria-hidden="true">
              {heroProducts.map((product, i) => (
                <div key={product.id} className={`relative aspect-square flex-1 overflow-hidden rounded-2xl bg-white shadow-2xl sm:w-32 xl:w-36 ${i === 1 ? "sm:translate-y-8" : ""} ${i === 2 ? "sm:col-span-2 sm:mx-auto sm:mt-4 sm:w-28" : ""}`}>
                  <Image src={productImage(product.image!)} alt="" fill priority sizes="144px" className="object-cover" />
                </div>
              ))}
            </div>
          </div>
          {[
            { title: "Top deals", text: biggestDeal ? `Up to ${biggestDeal}% off` : "Great prices", href: "/products?sort=discount&discount=10", product: deals[0], tint: "bg-rose-100 dark:bg-rose-950/50" },
            { title: "New arrivals", text: "Fresh this week", href: "/products?sort=newest", product: latest.find((p) => p.image && !heroProducts.some((h) => h.id === p.id) && p.id !== deals[0]?.id) ?? latest[0], tint: "bg-sky-100 dark:bg-sky-950/50" },
          ].map((tile) => (
            <Link key={tile.title} href={tile.href} className={`group relative flex min-h-40 items-center justify-between gap-3 overflow-hidden rounded-3xl p-6 ${tile.tint}`}>
              <span>
                <span className="block text-sm text-muted-foreground">{tile.text}</span>
                <span className="mt-1 block text-2xl font-semibold tracking-tight">{tile.title}</span>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium underline-offset-4 group-hover:underline">Shop now <ArrowRight className="size-4" aria-hidden="true" /></span>
              </span>
              {tile.product?.image && (
                <span className="relative size-28 shrink-0 overflow-hidden rounded-2xl bg-white shadow-lg transition-transform duration-500 group-hover:scale-105 sm:size-32">
                  <Image src={productImage(tile.product.image)} alt="" fill sizes="128px" className="object-cover" />
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>

      {rail.length > 0 && (
        <section className={`${container} pt-8 sm:pt-10`} aria-label="Shop by category">
          <ul className="scrollbar-hide -mx-5 flex gap-4 overflow-x-auto px-5 sm:mx-0 sm:px-0 lg:justify-between">
            {rail.map((category) => {
              const image = category.image ? categoryImage(category.image) : category.sample_image ? productImage(category.sample_image) : null;
              return (
                <li key={category.id} className="w-20 shrink-0 sm:w-24">
                  <Link href={categoryUrl(category.slug)} className="group block text-center">
                    <span className="relative mx-auto block size-20 overflow-hidden rounded-full border bg-muted transition-shadow group-hover:ring-2 group-hover:ring-primary group-hover:ring-offset-2 group-hover:ring-offset-background sm:size-24">
                      {image && <Image src={image} alt="" fill sizes="96px" className="object-cover" />}
                    </span>
                    <span className="mt-2 line-clamp-2 block text-xs leading-tight font-medium">{category.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className={`${container} pt-8 sm:pt-10`} aria-label="Why shop with us">
        <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border lg:grid-cols-4">
          {TRUST.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-center gap-3 bg-card p-4">
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              <span className="min-w-0"><span className="block text-sm font-medium">{title}</span><span className="block text-xs text-muted-foreground">{text}</span></span>
            </li>
          ))}
        </ul>
      </section>

      {deals.length > 0 && (
        <Shelf title="Top deals" subtitle={biggestDeal ? `Save up to ${biggestDeal}% on these picks` : undefined} href="/products?sort=discount&discount=10">
          <ProductGrid products={deals} />
        </Shelf>
      )}

      <section className={`${container} pb-2`} aria-label="Shop by budget">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><BadgePercent className="size-5" aria-hidden="true" /> Shop by budget</h2>
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {BUDGETS.map((b) => (
            <Link key={b.label} href={b.href} className={`group flex items-center justify-between rounded-2xl p-5 text-lg font-semibold tracking-tight transition-shadow hover:shadow-md ${b.tint}`}>
              {b.label} <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      {latest.length > 0 && (
        <Shelf title="New arrivals" subtitle="The latest additions to the store" href="/products?sort=newest">
          <Slider arrows={latest.length > 4}>
            {latest.map((product) => <ProductCard key={product.id} product={product} badge="new" sizes="(max-width: 640px) 50vw, 25vw" />)}
          </Slider>
        </Shelf>
      )}

      {bestsellers.length > 0 && (
        <Shelf muted title="Bestsellers" subtitle="What customers are buying" href="/products?sort=popularity">
          <ProductGrid products={bestsellers} badge="trending" />
        </Shelf>
      )}

      {showcases.map(({ category, products }) => (
        <section key={category.id} aria-label={category.name} className="py-8 sm:py-10">
          <div className={`${container} grid gap-3 sm:gap-4 lg:grid-cols-[17rem_1fr]`}>
            <Link href={categoryUrl(category.slug)} className="group relative isolate flex min-h-44 flex-col justify-end overflow-hidden rounded-2xl bg-neutral-900 p-5 text-white">
              {category.image && <Image src={categoryImage(category.image)} alt="" fill sizes="(max-width: 1024px) 100vw, 272px" className="-z-10 object-cover opacity-80 transition-transform duration-700 group-hover:scale-105" />}
              <span aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
              <h2 className="text-2xl font-semibold tracking-tight">{category.name}</h2>
              <span className="mt-1 inline-flex items-center gap-1 text-sm text-white/80">{category.product_count} products <ArrowRight className="size-4" aria-hidden="true" /></span>
            </Link>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {products.map((product) => <ProductCard key={product.id} product={product} showCategory={false} sizes="(max-width: 640px) 50vw, 20vw" />)}
            </div>
          </div>
        </section>
      ))}

      {featured.length > 0 && (
        <Shelf muted title="Handpicked for you" href="/products?featured=1">
          <ProductGrid products={featured} />
        </Shelf>
      )}

      <section aria-label="Frequently asked questions" className="py-10 sm:py-14">
        <div className={`${container} grid gap-6 lg:grid-cols-[1fr_2fr] lg:gap-12`}>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Questions? Answered.</h2>
            <p className="mt-2 text-sm text-muted-foreground">Still need help? <Link href="/contact" className="font-medium text-foreground underline underline-offset-4">Contact us</Link></p>
          </div>
          <Accordion type="single" collapsible>
            {faqs.map((faq) => (
              <AccordionItem key={faq.question} value={faq.question}>
                <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": seo.orgType,
          name: seo.orgName,
          url: SITE_URL,
          logo: new URL(seo.orgLogo || "/assets/logo-black.png", SITE_URL).href,
          contactPoint: { "@type": "ContactPoint", telephone: store.phone, contactType: "customer service", email: store.email },
          address: seo.address.street ? { "@type": "PostalAddress", streetAddress: seo.address.street, addressLocality: seo.address.city, addressRegion: seo.address.state, postalCode: seo.address.postal, addressCountry: seo.address.country } : undefined,
          sameAs: Object.values(store.socials).filter(Boolean),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: store.name,
          url: SITE_URL,
          potentialAction: { "@type": "SearchAction", target: `${SITE_URL}/products?search={search_term_string}`, "query-input": "required name=search_term_string" },
        }}
      />
      <SeoSchema type="page" entityKey="home" />
    </>
  );
}
