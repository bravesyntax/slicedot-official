import SeoSchema from "@/components/SeoSchema";
import { pageMetadata } from "@/lib/seo";
import FaqBrowser, { type FaqGroup } from "@/components/faq/FaqBrowser";
import JsonLd from "@/components/JsonLd";
import { CtaLink, PageHero, container } from "@/components/site/ui";

export const generateMetadata = () => pageMetadata("faq");

const GROUPS: FaqGroup[] = [
  {
    id: "orders",
    label: "Orders",
    items: [
      ["How do I place an order?", "Simply browse our products, add items to your cart, and proceed to checkout. Sign in with your email or Google account, then follow the steps to enter your shipping address and payment details."],
      ["Can I modify or cancel my order?", 'You can cancel your order within 24 hours of placing it, provided it hasn\'t been shipped yet. Go to "My Orders" in your account and click "Cancel Order". We cannot modify orders once placed — please cancel and place a new order if needed.'],
      ["How do I track my order?", 'Once your order is shipped, you\'ll receive an email with your tracking number. You can also log into your account and visit "My Orders", then click on the order to see real-time tracking updates.'],
    ],
  },
  {
    id: "shipping",
    label: "Shipping",
    items: [
      ["What are the shipping charges?", "We offer FREE shipping on all orders above ₹499. For orders below ₹499, a flat shipping fee of ₹49 applies across India."],
      ["How long does delivery take?", "Delivery typically takes 3–7 business days depending on your location. Metro cities receive orders in 3–5 days, while remote areas may take up to 10 business days."],
      ["Do you ship internationally?", "Currently, we only ship within India. We're working on expanding our shipping to international destinations — stay tuned!"],
    ],
  },
  {
    id: "returns",
    label: "Returns & Refunds",
    items: [
      ["What is your return policy?", "We offer a 7-day return policy from the date of delivery. Items must be unused, with original tags attached, and in their original packaging. Some items like innerwear and personalized products are non-returnable."],
      ["How do I initiate a return?", 'Log into your account, go to "My Orders", select the order and click "Return Item". Choose the reason for return and schedule a pickup. Our team will collect the item from your address — completely free of charge.'],
      ["When will I receive my refund?", "Once we receive and verify your returned item, refunds are processed within 5–7 business days and credited to your original payment method."],
    ],
  },
  {
    id: "payment",
    label: "Payment",
    items: [
      ["What payment methods do you accept?", "We accept Credit/Debit Cards (Visa, Mastercard, Rupay), UPI (Google Pay, PhonePe, Paytm), Net Banking, Wallets, and Cash on Delivery (COD)."],
      ["Is Cash on Delivery available?", "Yes! Cash on Delivery is available for most pin codes across India. COD availability is shown at checkout based on your delivery address."],
      ["Is my payment information secure?", "Absolutely. All payments are processed through Razorpay, a PCI-DSS Level 1 certified gateway. Your card details are encrypted and never stored on our servers."],
    ],
  },
  {
    id: "account",
    label: "Account",
    items: [
      ["How do I create an account?", "Click the profile icon in the header and enter your email. We'll send you a one-time code to sign in, and your account is created automatically. You can also continue with Google."],
      ["Do I need a password?", "No. You sign in with a one-time code sent to your email, or with your Google account."],
      ["How do I update my account information?", 'Log into your account and go to "My Account". From there you can update personal details and manage delivery addresses.'],
    ],
  },
];

export default function FaqPage() {
  return (
    <>
    <>
      <PageHero eyebrow="Help Center" title="Frequently Asked Questions">
        Find answers to common questions about orders, shipping, returns, and more.
      </PageHero>
      <section className={`${container} pb-14 sm:pb-24`} aria-label="Questions and answers">
        <FaqBrowser groups={GROUPS} />
        <div className="mx-auto mt-12 max-w-3xl rounded-2xl border bg-muted/40 p-6 text-center dark:bg-muted/20">
          <h2 className="font-medium">Still need help?</h2>
          <p className="mt-1 text-sm text-muted-foreground">Can&apos;t find the answer you&apos;re looking for? Reach out to us.</p>
          <div className="mt-4"><CtaLink href="/contact">Contact Support</CtaLink></div>
        </div>
      </section>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: GROUPS.flatMap((g) => g.items).map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })),
        }}
      />
    </>
      <SeoSchema type="page" entityKey="faq" />
    </>
  );
}
