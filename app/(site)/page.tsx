import { ArrowRight, BadgeCheck, Check, Gift, Headset, Layers, Package, RefreshCw, ShieldCheck, Truck, Zap } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import ProductCard from "@/components/home/ProductCard";
import Slider from "@/components/home/Slider";
import { CtaLink, IconChip, PageHero, Section, SectionHeading, ShimmerLink, container } from "@/components/site/ui";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BlurFade } from "@/components/velora/blur-fade";
import { BorderBeam } from "@/components/velora/border-beam";
import { Marquee } from "@/components/velora/marquee";
import { SpotlightCard } from "@/components/velora/spotlight-card";
import { getCategoryProducts, getFeaturedProducts, getHomeFaqs, getLatestProducts, getRootCategories, getTrendingProducts } from "@/lib/catalog";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { categoryImage, categoryUrl } from "@/lib/routes";
import { getSeoSettings, getStoreSettings } from "@/lib/settings";

export const revalidate = 300;

// Root categories that get their own product slider, in this order.
const SLIDER_CATEGORIES = ["Jewelry", "Kitchen & Home", "Perfumes", "Phone Accessories"];

const TRUST = [
  { icon: Truck, title: "Free Shipping", text: "Orders ₹499+" },
  { icon: RefreshCw, title: "Easy Returns", text: "7-day policy" },
  { icon: ShieldCheck, title: "Secure Pay", text: "100% safe" },
  { icon: Headset, title: "24/7 Support", text: "Always here" },
];
const DIFFERENCE = [
  { icon: Check, title: "Quality", text: "Premium items" },
  { icon: Zap, title: "Fast Ship", text: "Quick delivery" },
  { icon: ShieldCheck, title: "Secure", text: "Safe payments" },
  { icon: RefreshCw, title: "Returns", text: "7-day policy" },
];
const FALLBACK_FAQS = [
  { question: "What types of products are available at SliceDot?", answer: "SliceDot offers hair accessories, phone essentials, kitchen gadgets, jewelry, perfumes, home decor, and lifestyle products at affordable prices." },
  { question: "How can I track my order?", answer: "Once shipped, you'll receive a tracking number via email and SMS. Track your delivery on our website or the courier's tracking page." },
  { question: "What is the return policy?", answer: "We offer a 7-day hassle-free return policy. Products must be unused and in original packaging." },
  { question: "Is Cash on Delivery available?", answer: "Yes, COD is available for most locations. You can also pay via Cards, UPI, Net Banking, or digital wallets." },
  { question: "How long does delivery take?", answer: "Standard delivery: 3–7 business days. Metro cities: 3–5 days. Express options available for select locations." },
  { question: "Are the products genuine?", answer: "Absolutely. All products are sourced from trusted manufacturers and undergo quality checks before listing." },
];

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoSettings();
  return {
    title: { absolute: seo.title || "SliceDot | Everything You Need, All in One Place" },
    description: seo.description,
    keywords: seo.keywords,
    alternates: { canonical: "/" },
    openGraph: { siteName: SITE_NAME, type: "website", locale: "en_IN", title: seo.title, description: seo.description, url: "/", images: ["/assets/logo-black.png"] },
  };
}

function ViewAll({ href, label = "View all" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
      {label}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}

export default async function HomePage() {
  const [store, seo, categories, featured, trending, latest, dbFaqs] = await Promise.all([
    getStoreSettings(),
    getSeoSettings(),
    getRootCategories(),
    getFeaturedProducts(),
    getTrendingProducts(),
    getLatestProducts(),
    getHomeFaqs(),
  ]);
  // seo_faq can hold the same question for both page = 'homepage' and page = 'all'.
  const faqs = dbFaqs.length ? dbFaqs.filter((faq, i) => dbFaqs.findIndex((f) => f.question === faq.question) === i) : FALLBACK_FAQS;
  const sliders = await Promise.all(
    SLIDER_CATEGORIES.map(async (name) => {
      const category = categories.find((c) => c.name === name);
      return category ? { category, products: await getCategoryProducts(category.id) } : null;
    }),
  );
  const popular = categories.filter((c) => c.product_count > 0).sort((a, b) => b.product_count - a.product_count);

  return (
    <>
      <PageHero
        eyebrow="New collection available"
        title="Everything you need, all in one place"
        center={false}
        actions={
          <>
            <ShimmerLink href="/products">Explore Collection <ArrowRight className="size-4" aria-hidden="true" /></ShimmerLink>
            <CtaLink href="/products?sort=newest" variant="outline" arrow={false}>New Arrivals</CtaLink>
          </>
        }
        aside={
          <div className="relative overflow-hidden rounded-3xl border bg-black shadow-xl">
            {/* eslint-disable-next-line @next/next/no-img-element -- animated GIF: the image optimizer would flatten it */}
            <img src="/assets/hero.gif" alt={`${store.name} new collection`} className="aspect-[4/3] w-full object-cover" />
            <BorderBeam />
          </div>
        }
      >
        Trending products for home, beauty, and lifestyle, all at amazing prices.
      </PageHero>

      <section className="border-y bg-muted/40 py-6 dark:bg-muted/20">
        <div className={container}>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {TRUST.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex items-center gap-3">
                <IconChip><Icon className="size-4" aria-hidden="true" /></IconChip>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{title}</p>
                  <p className="truncate text-xs text-muted-foreground">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Section label="Shop by category">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading eyebrow="Explore" title="Shop by Category" />
          <ViewAll href="/categories" />
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
          {categories.slice(0, 8).map((category, index) => (
            <BlurFade key={category.id} delay={index * 0.05} className={index === 0 ? "sm:col-span-2 sm:row-span-2" : ""}>
              <Link href={categoryUrl(category.slug)} className="group relative block h-full min-h-44 overflow-hidden rounded-2xl border bg-muted">
                {category.image && (
                  <Image src={categoryImage(category.image)} alt={category.name} fill sizes="(max-width: 640px) 50vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                )}
                <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <span className="mb-1 inline-flex items-center gap-1 text-xs text-white/80">
                    <Package className="size-3" aria-hidden="true" /> {category.product_count} items
                  </span>
                  <h3 className="leading-tight font-semibold text-white underline-offset-4 group-hover:underline">{category.name}</h3>
                </div>
              </Link>
            </BlurFade>
          ))}
        </div>
      </Section>

      {sliders.map((slider) =>
        slider && slider.products.length > 0 ? (
          <Section key={slider.category.id} muted label={slider.category.name}>
            <div className="flex items-end justify-between gap-4">
              <SectionHeading eyebrow="Explore our collection" title={slider.category.name} />
              <ViewAll href={categoryUrl(slider.category.slug)} />
            </div>
            <div className="mt-10">
              <Slider arrows={slider.products.length > 4}>
                {slider.products.map((product) => (
                  <ProductCard key={product.id} product={product} sizes="280px" />
                ))}
              </Slider>
            </div>
          </Section>
        ) : null,
      )}

      {featured.length > 0 && (
        <Section label="Featured products">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading eyebrow="Handpicked" title="Featured Products" />
            <ViewAll href="/products?featured=1" />
          </div>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {featured.map((product, i) => (
              <BlurFade key={product.id} delay={i * 0.04} className="h-full"><ProductCard product={product} /></BlurFade>
            ))}
          </div>
        </Section>
      )}

      <section className={`${container} pb-14 sm:pb-24`} aria-label="Free shipping offer">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-12 text-primary-foreground sm:px-12 lg:px-16">
          <BorderBeam />
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div className="text-center lg:text-left">
              <span className="inline-flex items-center gap-2 text-sm opacity-80"><Gift className="size-4" aria-hidden="true" /> Limited Offer</span>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Free shipping on ₹499+</h2>
              <p className="mt-3 opacity-80">Shop now and enjoy free delivery plus easy 7-day returns.</p>
              <Link href="/products" className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-background px-6 text-sm font-medium text-foreground transition-opacity hover:opacity-90">
                Shop Now <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[["24/7", "Support"], ["100%", "Secure"], ["7", "Day Returns"]].map(([value, label]) => (
                <div key={label} className="rounded-2xl border border-current/15 p-4 text-center">
                  <div className="text-2xl font-semibold sm:text-3xl">{value}</div>
                  <div className="mt-1 text-xs opacity-70">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {trending.length > 0 && (
        <Section muted label="Trending products">
          <SectionHeading center eyebrow="Hot now" title="Trending Products" />
          <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {trending.map((product, i) => (
              <BlurFade key={product.id} delay={i * 0.04} className="h-full">
                <ProductCard product={product} badge="trending" showCategory={false} showCompare={false} showSold />
              </BlurFade>
            ))}
          </div>
          <div className="mt-8 text-center">
            <CtaLink href="/products?sort=popular" variant="outline">View All Trending</CtaLink>
          </div>
        </Section>
      )}

      {latest.length > 0 && (
        <Section label="New arrivals">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <SectionHeading eyebrow="Just arrived" title="New Arrivals">Discover our latest collection. Fresh styles added weekly.</SectionHeading>
              <div className="mt-6"><CtaLink href="/products?sort=newest">Shop New Arrivals</CtaLink></div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {latest.map((product) => (
                <ProductCard key={product.id} product={product} badge="new" maxColors={3} showCategory={false} showCompare={false} showRating={false} />
              ))}
            </div>
          </div>
        </Section>
      )}

      <Section muted label={`The ${store.name} difference`}>
        <SectionHeading center eyebrow="Why shop with us" title={`The ${store.name} Difference`} />
        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {DIFFERENCE.map(({ icon: Icon, title, text }) => (
            <SpotlightCard key={title} className="rounded-2xl border bg-card p-5 text-card-foreground">
              <IconChip><Icon className="size-4" aria-hidden="true" /></IconChip>
              <h3 className="mt-4 font-medium">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </SpotlightCard>
          ))}
        </div>
      </Section>

      {popular.length > 0 && (
        <section aria-label="Browse categories" className="border-b py-6">
          <Marquee pauseOnHover>
            {popular.map((category) => (
              <Link key={category.id} href={categoryUrl(category.slug)} className="mx-1 rounded-full border bg-card px-4 py-2 text-sm whitespace-nowrap transition-colors hover:border-primary hover:text-primary">
                {category.name} <span className="text-xs text-muted-foreground tabular-nums">{category.product_count}</span>
              </Link>
            ))}
          </Marquee>
        </section>
      )}

      <Section label={`Online shopping at ${store.name}`}>
        <SectionHeading title={`Online Shopping at ${store.name}`} />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <SpotlightCard className="rounded-2xl border bg-card p-6 text-card-foreground">
            <IconChip><BadgeCheck className="size-4" aria-hidden="true" /></IconChip>
            <h3 className="mt-4 font-medium">Why Choose Us?</h3>
            <p className="mt-2 text-sm text-muted-foreground">Welcome to {store.name}, India&apos;s destination for quality products at affordable prices.</p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {["Free shipping on ₹499+", "7-day easy returns", "100% authentic products", "COD available"].map((benefit) => (
                <li key={benefit} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" /> {benefit}</li>
              ))}
            </ul>
          </SpotlightCard>
          <SpotlightCard className="rounded-2xl border bg-card p-6 text-card-foreground">
            <IconChip><Layers className="size-4" aria-hidden="true" /></IconChip>
            <h3 className="mt-4 font-medium">Product Range</h3>
            <div className="mt-2 space-y-2 text-sm text-muted-foreground">
              <p><strong className="font-medium text-foreground">Hair &amp; Beauty:</strong> Haircare, makeup accessories, clips, scrunchies</p>
              <p><strong className="font-medium text-foreground">Jewelry:</strong> Necklaces, earrings, bracelets, rings</p>
              <p><strong className="font-medium text-foreground">Kitchen &amp; Home:</strong> Gadgets, storage, decor items</p>
              <p><strong className="font-medium text-foreground">Phone Accessories:</strong> Cases, protectors, chargers</p>
              <p><strong className="font-medium text-foreground">Perfumes:</strong> Floral, oud, fruity &amp; woody fragrances</p>
            </div>
          </SpotlightCard>
          <SpotlightCard className="rounded-2xl border bg-card p-6 text-card-foreground">
            <IconChip><Truck className="size-4" aria-hidden="true" /></IconChip>
            <h3 className="mt-4 font-medium">Fast Delivery Across India</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              We deliver across India. Secure payments via Cards, UPI, Net Banking, and COD. Shop worry-free with SSL encryption.
            </p>
          </SpotlightCard>
        </div>
      </Section>

      <Section muted label="Frequently asked questions">
        <SectionHeading center title="Frequently Asked Questions" />
        <Accordion type="single" collapsible className="mx-auto mt-8 max-w-3xl">
          {faqs.map((faq) => (
            <AccordionItem key={faq.question} value={faq.question}>
              <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Section>

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
          "@type": "Organization",
          name: store.name,
          url: SITE_URL,
          logo: `${SITE_URL}/assets/logo-black.png`,
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
    </>
  );
}
