import { AlertCircle, CalendarClock, MapPinned, PackageCheck, Truck } from "lucide-react";
import type { Metadata } from "next";
import { CtaLink, IconChip, PageHero, Section, SectionHeading, container } from "@/components/site/ui";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { SpotlightCard } from "@/components/velora/spotlight-card";

export const metadata: Metadata = {
  title: "Shipping Information",
  description: "Learn about shipping options, delivery times, and charges at SliceDot.",
  alternates: { canonical: "/shipping" },
};

const HIGHLIGHTS = [
  { icon: Truck, value: "FREE", label: "Orders ₹499+" },
  { icon: CalendarClock, value: "3-7", label: "Business days" },
  { icon: MapPinned, value: "India", label: "Delivery across the country" },
  { icon: PackageCheck, value: "Live", label: "Order tracking" },
];
const ZONES = [
  ["Metro Cities (Delhi, Mumbai, Bangalore, etc.)", "3–5 business days"],
  ["Tier 2 Cities", "4–6 business days"],
  ["Tier 3 Cities & Towns", "5–7 business days"],
  ["Remote Areas", "7–10 business days"],
];
const STEPS = [
  ["Order Confirmation", "You'll receive an email confirmation immediately after placing your order."],
  ["Processing (24–48 hours)", "We carefully prepare and pack your order at our warehouse."],
  ["Shipped", "You'll receive a tracking number via email/SMS once your order is dispatched."],
  ["Delivered", "Your order arrives safely at your doorstep!"],
];
const PARTNERS = ["Delhivery", "Blue Dart", "DTDC", "Ekart", "India Post"];
const TRACKING = ['Login to your account → "My Orders"', "Use tracking link in shipping email", "Contact support with your order number"];
const NOTES = [
  "Orders placed after 2 PM may be processed the next business day.",
  "We do not ship on Sundays and public holidays.",
  "Please ensure someone is available to receive the package.",
  "For Cash on Delivery orders, please keep exact change ready.",
  "We currently ship only within India.",
];

export default function ShippingPage() {
  return (
    <>
      <PageHero eyebrow="Shipping" title="Shipping Information">
        Fast, reliable delivery across India. Track your order every step of the way.
      </PageHero>

      <section className={`${container} pb-14`} aria-label="Shipping highlights">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {HIGHLIGHTS.map(({ icon: Icon, value, label }) => (
            <SpotlightCard key={label} className="rounded-2xl border bg-card p-5 text-card-foreground">
              <IconChip><Icon className="size-4" aria-hidden="true" /></IconChip>
              <p className="mt-4 text-2xl font-semibold">{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </SpotlightCard>
          ))}
        </div>
      </section>

      <Section muted label="Delivery times and charges">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading title="Estimated Delivery Times" />
            <div className="mt-6 rounded-2xl border bg-card">
              <Table>
                <TableBody>
                  {ZONES.map(([zone, time]) => (
                    <TableRow key={zone}>
                      <TableCell className="whitespace-normal">{zone}</TableCell>
                      <TableCell className="text-right"><Badge variant="secondary">{time}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="mt-4 text-sm text-muted-foreground"><strong className="font-medium text-foreground">Note:</strong> Delivery times are estimates and may vary due to unforeseen circumstances, holidays, or natural events.</p>
          </div>
          <div>
            <SectionHeading title="Shipping Charges" />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border bg-card p-6">
                <p className="text-3xl font-semibold">FREE</p>
                <p className="mt-2 font-medium">Orders above ₹499</p>
                <p className="text-sm text-muted-foreground">Standard delivery across India</p>
              </div>
              <div className="rounded-2xl border bg-card p-6">
                <p className="text-3xl font-semibold">₹49</p>
                <p className="mt-2 font-medium">Orders below ₹499</p>
                <p className="text-sm text-muted-foreground">Flat rate shipping charge</p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section label="Order processing">
        <SectionHeading center title="Order Processing" />
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

      <Section muted label="Partners, tracking and notes">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border bg-card p-6">
            <h2 className="font-semibold">Shipping Partners</h2>
            <p className="mt-2 text-sm text-muted-foreground">We partner with India&apos;s leading courier services:</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {PARTNERS.map((p) => <Badge key={p} variant="outline">{p}</Badge>)}
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-6">
            <h2 className="font-semibold">Track Your Order</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              {TRACKING.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </div>
          <div className="rounded-2xl border bg-card p-6">
            <h2 className="font-semibold">Important Notes</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {NOTES.map((n) => (
                <li key={n} className="flex gap-2"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {n}</li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section label="Shipping questions">
        <SectionHeading center title="Questions About Shipping?">Our support team is happy to help you with any shipping queries.</SectionHeading>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <CtaLink href="/contact">Contact Support</CtaLink>
          <CtaLink href="/faq" variant="outline" arrow={false}>View FAQs</CtaLink>
        </div>
      </Section>
    </>
  );
}
