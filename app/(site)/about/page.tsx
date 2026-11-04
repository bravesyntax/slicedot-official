import SeoSchema from "@/components/SeoSchema";
import { pageMetadata } from "@/lib/seo";
import { Check, Lightbulb, ShieldCheck, Users } from "lucide-react";
import { CtaLink, IconChip, PageHero, Section, SectionHeading } from "@/components/site/ui";
import { BlurFade } from "@/components/velora/blur-fade";
import { SpotlightCard } from "@/components/velora/spotlight-card";
import { getStoreSettings } from "@/lib/settings";

export const generateMetadata = () => pageMetadata("about");

const VALUES = [
  { icon: ShieldCheck, title: "Quality First", text: "We never compromise on quality. Every product goes through rigorous quality checks before reaching you." },
  { icon: Users, title: "Customer Focus", text: "Your satisfaction is our priority. We listen, adapt, and improve based on your valuable feedback." },
  { icon: Lightbulb, title: "Innovation", text: "We constantly evolve to bring you the latest trends and cutting-edge products in the market." },
];

export default async function AboutPage() {
  const store = await getStoreSettings();
  return (
    <>
    <>
      <PageHero eyebrow="Our Story" title={`About ${store.name}`}>
        We&apos;re passionate about bringing you the best products at unbeatable prices. Our journey started with a simple idea: make quality accessible to everyone.
      </PageHero>

      <Section label="Our mission">
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
          <SectionHeading eyebrow="Our Mission" title="Delivering Excellence, Every Time" />
          <BlurFade delay={0.1}>
            <div className="space-y-4 text-muted-foreground">
              <p>At {store.name}, we believe that everyone deserves access to high-quality products without breaking the bank. We carefully curate our collection to ensure that each item meets our strict standards for quality, style, and value.</p>
              <p>Our team works tirelessly to source the best products from trusted suppliers, ensuring that you receive nothing but the best. From trending fashion to everyday essentials, we&apos;ve got you covered.</p>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
              {["Quality Assured", "Customer First", "Fast Shipping"].map((item) => (
                <li key={item} className="inline-flex items-center gap-2"><Check className="size-4 text-success" aria-hidden="true" /> {item}</li>
              ))}
            </ul>
          </BlurFade>
        </div>
      </Section>

      <Section muted label="Our core values">
        <SectionHeading center eyebrow="What We Stand For" title="Our Core Values" />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {VALUES.map(({ icon: Icon, title, text }, i) => (
            <BlurFade key={title} delay={i * 0.06} className="h-full">
              <SpotlightCard className="h-full rounded-2xl border bg-card p-6 text-card-foreground">
                <IconChip><Icon className="size-4" aria-hidden="true" /></IconChip>
                <h3 className="mt-4 font-medium">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{text}</p>
              </SpotlightCard>
            </BlurFade>
          ))}
        </div>
      </Section>

      <Section label="Start shopping">
        <SectionHeading center title="Ready to Start Shopping?">Explore our collection and discover amazing products at great prices.</SectionHeading>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <CtaLink href="/products">Shop Now</CtaLink>
          <CtaLink href="/contact" variant="outline" arrow={false}>Contact Us</CtaLink>
        </div>
      </Section>
    </>
      <SeoSchema type="page" entityKey="about" />
    </>
  );
}
