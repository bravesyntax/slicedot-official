import SeoSchema from "@/components/SeoSchema";
import { pageMetadata } from "@/lib/seo";
import { Mail, MapPin, Phone } from "lucide-react";
import ContactForm from "@/components/contact/ContactForm";
import { IconChip, PageHero, RelatedLinks, container } from "@/components/site/ui";
import { BlurFade } from "@/components/velora/blur-fade";
import { getStoreSettings } from "@/lib/settings";

export const generateMetadata = () => pageMetadata("contact");

export default async function ContactPage() {
  const store = await getStoreSettings();
  return (
    <>
    <>
      <PageHero eyebrow="Get In Touch" title="Contact Us">
        Have a question or need assistance? We&apos;re here to help. Reach out to us anytime.
      </PageHero>

      <section className={`${container} pb-14 sm:pb-24`} aria-label="Contact details and form">
        <div className="grid items-start gap-10 lg:grid-cols-5">
          <BlurFade className="lg:col-span-2">
            <h2 className="text-2xl font-semibold tracking-tight">Get in Touch</h2>
            <p className="mt-3 text-muted-foreground">We&apos;d love to hear from you. Whether you have a question about products, orders, or anything else, our team is ready to answer all your questions.</p>
            <ul className="mt-8 space-y-6">
              <li className="flex gap-4">
                <IconChip><Mail className="size-4" aria-hidden="true" /></IconChip>
                <div className="min-w-0">
                  <h3 className="font-medium">Email Us</h3>
                  <a href={`mailto:${store.email}`} className="block truncate text-sm text-muted-foreground transition-colors hover:text-foreground">{store.email}</a>
                  <p className="text-xs text-muted-foreground">We reply within 24 hours</p>
                </div>
              </li>
              {store.phone && (
                <li className="flex gap-4">
                  <IconChip><Phone className="size-4" aria-hidden="true" /></IconChip>
                  <div>
                    <h3 className="font-medium">Call Us</h3>
                    <a href={`tel:${store.phone.replace(/[^0-9+]/g, "")}`} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{store.phone}</a>
                    <p className="text-xs text-muted-foreground">Mon-Sat, 10AM - 7PM</p>
                  </div>
                </li>
              )}
              {store.address && (
                <li className="flex gap-4">
                  <IconChip><MapPin className="size-4" aria-hidden="true" /></IconChip>
                  <div>
                    <h3 className="font-medium">Address</h3>
                    <p className="text-sm whitespace-pre-line text-muted-foreground">{store.address}</p>
                  </div>
                </li>
              )}
            </ul>
          </BlurFade>
          <BlurFade delay={0.1} className="lg:col-span-3">
            <ContactForm />
          </BlurFade>
        </div>
      </section>

      <RelatedLinks
        title="Quick help"
        links={[
          ["FAQs", "/faq"],
          ["Shipping Info", "/shipping"],
          ["Returns & Refunds", "/returns"],
          ["Terms", "/terms"],
          ["Privacy Policy", "/privacy-policy"],
        ]}
      />
    </>
      <SeoSchema type="page" entityKey="contact" />
    </>
  );
}
