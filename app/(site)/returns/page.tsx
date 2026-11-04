import { Check, X } from "lucide-react";
import type { Metadata } from "next";
import { CtaLink, PageHero, Section, SectionHeading, container } from "@/components/site/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SpotlightCard } from "@/components/velora/spotlight-card";
import { getStoreSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Returns & Refund Policy",
  description: "Learn about our hassle-free returns and refund policy at SliceDot.",
  alternates: { canonical: "/returns" },
};

const HIGHLIGHTS = [["7 Days", "Return Window"], ["Free", "Return Pickup"], ["5–7 Days", "Refund Time"], ["100%", "Money Back"]];
const STEPS = [
  ["Request Return", "Go to My Orders and select the item to return"],
  ["Pack Item", "Use original tags and packaging for the return"],
  ["Pickup", "We'll collect the package from your address"],
  ["Refund", "Receive your refund within 5–7 business days"],
];
const ELIGIBLE = ["Items returned within 7 days of delivery", "Unused items with original tags attached", "Items in original packaging", "Defective or damaged products", "Wrong item delivered"];
const NOT_ELIGIBLE = ["Items without original tags or packaging", "Used, washed, or altered items", "Intimate wear, swimwear, and innerwear", "Beauty and personal care products", 'Items marked as "Final Sale"', "Customized or personalized products"];
const REFUNDS = [
  ["Credit / Debit Card", "5–7 business days", "Original payment method"],
  ["UPI / Net Banking", "3–5 business days", "Original payment method"],
  ["Wallet (Razorpay)", "1–2 business days", "Wallet balance"],
  ["Cash on Delivery", "5–7 business days", "Bank Transfer / UPI"],
];

export default async function ReturnsPage() {
  const store = await getStoreSettings();
  return (
    <>
      <PageHero eyebrow="Returns & Refunds" title="Returns & Refunds">
        Easy returns, quick refunds. Your satisfaction is our priority.
      </PageHero>

      <section className={`${container} pb-14`} aria-label="Returns highlights">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {HIGHLIGHTS.map(([value, label]) => (
            <SpotlightCard key={label} className="rounded-2xl border bg-card p-5 text-center text-card-foreground">
              <p className="text-2xl font-semibold">{value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{label}</p>
            </SpotlightCard>
          ))}
        </div>
      </section>

      <Section muted label="How to return">
        <SectionHeading center title="How to Return">Four simple steps to complete your return</SectionHeading>
        <ol className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="rounded-2xl border bg-card p-5">
              <span className="grid size-8 place-items-center rounded-full bg-primary text-sm font-medium text-primary-foreground">{i + 1}</span>
              <h3 className="mt-4 font-medium">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section label="What can be returned">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border bg-card p-6">
            <h2 className="text-lg font-semibold">Eligible for Return</h2>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              {ELIGIBLE.map((item) => <li key={item} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" /> {item}</li>)}
            </ul>
          </div>
          <div className="rounded-2xl border bg-card p-6">
            <h2 className="text-lg font-semibold">Not Eligible for Return</h2>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              {NOT_ELIGIBLE.map((item) => <li key={item} className="flex gap-2"><X className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" /> {item}</li>)}
            </ul>
          </div>
        </div>
      </Section>

      <Section muted label="Refund details">
        <SectionHeading title="Refund Details by Payment Method" />
        <div className="mt-6 rounded-2xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment Method</TableHead>
                <TableHead>Refund Time</TableHead>
                <TableHead>Refund Mode</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {REFUNDS.map(([method, time, mode]) => (
                <TableRow key={method}>
                  <TableCell className="font-medium">{method}</TableCell>
                  <TableCell>{time}</TableCell>
                  <TableCell>{mode}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>

      <Section label="Exchanges and help">
        <div className="mx-auto max-w-3xl text-center">
          <SectionHeading center title="Exchange Policy">
            We currently don&apos;t offer direct exchanges. If you&apos;d like a different size or color, please return the original item and place a new order. Contact us for personalized sizing recommendations.
          </SectionHeading>
          <h2 className="mt-12 text-2xl font-semibold tracking-tight">Need Help with a Return?</h2>
          <p className="mt-2 text-muted-foreground">Our support team is here to assist you with any return-related queries.</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <CtaLink href="/contact">Contact Support</CtaLink>
            <a href={`mailto:${store.email}`} className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">{store.email}</a>
          </div>
        </div>
      </Section>
    </>
  );
}
