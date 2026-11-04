import { Mail, Phone, ShieldCheck } from "lucide-react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import { TextHoverEffect } from "@/components/velora/text-hover-effect";
import { getRootCategories } from "@/lib/catalog";
import { categoryUrl } from "@/lib/routes";
import { getStoreSettings } from "@/lib/settings";

const SOCIALS = [
  { key: "instagram", label: "Instagram", path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" },
  { key: "facebook", label: "Facebook", path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" },
  { key: "twitter", label: "X (Twitter)", path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
  { key: "pinterest", label: "Pinterest", path: "M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" },
  { key: "youtube", label: "YouTube", path: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" },
] as const;

const HELP = [
  ["/contact", "Contact Us"],
  ["/faq", "FAQ"],
  ["/shipping", "Shipping Info"],
  ["/returns", "Returns & Refunds"],
  ["/account", "My Account"],
];
const COMPANY = [
  ["/about", "About Us"],
  ["/terms", "Terms & Conditions"],
  ["/privacy-policy", "Privacy Policy"],
];
const PAYMENTS = ["Razorpay", "Visa", "Mastercard", "UPI", "Cash on Delivery", "Net Banking"];

function LinkColumn({ title, links }: { title: string; links: string[][] }) {
  return (
    <div>
      <h2 className="text-sm font-medium">{title}</h2>
      <ul className="mt-4 space-y-2.5">
        {links.map(([href, label]) => (
          <li key={label}>
            <Link href={href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function Footer() {
  const [store, categories] = await Promise.all([getStoreSettings(), getRootCategories()]);
  const shop = [
    ["/products", "All Products"],
    ...categories.slice(0, 5).map((c) => [categoryUrl(c.slug), c.name]),
    ["/products?featured=1", "Featured"],
    ["/products?sort=newest", "New Arrivals"],
  ];

  return (
    <footer className="border-t bg-muted/40 dark:bg-muted/20">
      <div className="mx-auto max-w-7xl px-5 pt-14 pb-8 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Link href="/" aria-label="SliceDot home" className="inline-flex"><Logo className="h-10" /></Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Your one-stop destination for trendy accessories, lifestyle products, and everyday essentials. Quality products at amazing prices, delivered to your doorstep.
            </p>
            <div className="mt-5 space-y-2 text-sm">
              <a href={`mailto:${store.email}`} className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
                <Mail className="size-4 shrink-0" aria-hidden="true" /> <span className="truncate">{store.email}</span>
              </a>
              {store.phone && (
                <a href={`tel:${store.phone.replace(/[^0-9+]/g, "")}`} className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
                  <Phone className="size-4 shrink-0" aria-hidden="true" /> {store.phone}
                </a>
              )}
            </div>
            <div className="mt-5 flex items-center gap-2">
              {SOCIALS.map((s) =>
                store.socials[s.key] ? (
                  <a key={s.key} href={store.socials[s.key]} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="grid size-9 place-items-center rounded-lg border bg-background text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                    <svg className="size-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d={s.path} /></svg>
                  </a>
                ) : null,
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-8">
            <LinkColumn title="Shop" links={shop} />
            <LinkColumn title="Help" links={HELP} />
            <LinkColumn title="Company" links={COMPANY} />
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card px-5 py-4">
          <span className="inline-flex items-center gap-2 text-sm font-medium"><ShieldCheck className="size-4 text-success" aria-hidden="true" /> Secure Payments</span>
          <div className="flex flex-wrap gap-1.5">
            {PAYMENTS.map((p) => <Badge key={p} variant="outline">{p}</Badge>)}
          </div>
        </div>

        <TextHoverEffect text="SLICEDOT" className="mt-8 hidden w-full sm:block" />

        <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>&copy; {new Date().getFullYear()} {store.name}. All rights reserved. Made with ♥ in India.</p>
          <nav className="flex items-center gap-4" aria-label="Legal links">
            <Link href="/terms" className="transition-colors hover:text-foreground">Terms</Link>
            <Link href="/privacy-policy" className="transition-colors hover:text-foreground">Privacy</Link>
            <Link href="/returns" className="transition-colors hover:text-foreground">Refunds</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
