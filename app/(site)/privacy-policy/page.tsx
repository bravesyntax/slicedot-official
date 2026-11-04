import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/layout/LegalPage";
import { getStoreSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How SliceDot collects, uses, and protects your personal information.",
  alternates: { canonical: "/privacy-policy" },
};

const CONTENTS: [string, string][] = [
  ["intro", "Introduction"], ["collect", "Information We Collect"], ["use", "How We Use It"], ["share", "Information Sharing"], ["security", "Data Security"], ["cookies", "Cookies"],
  ["rights", "Your Rights"], ["payment", "Payment Security"], ["children", "Children's Privacy"], ["changes", "Policy Changes"], ["contact-us", "Contact Us"],
];

const Terms = ({ items }: { items: [string, string][] }) => (
  <ul>{items.map(([term, text]) => <li key={term}><strong>{term}:</strong> {text}</li>)}</ul>
);

export default async function PrivacyPage() {
  const { name, email, phone } = await getStoreSettings();
  return (
    <LegalPage title="Privacy Policy" lead="We are committed to protecting your personal information and your right to privacy." contents={CONTENTS}>
      <p><strong>Our commitment:</strong> We value your trust and will never sell your personal data to third parties. Your privacy is fundamental to how we operate.</p>

      <h2 id="intro">Introduction</h2>
      <p>Welcome to <strong>{name}</strong>. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or make a purchase from us.</p>

      <h2 id="collect">Information We Collect</h2>
      <h3>Personal Information You Provide</h3>
      <Terms items={[["Identity Data", "Name, username, date of birth, gender"], ["Contact Data", "Email address, phone number, delivery address"], ["Transaction Data", "Order details & payment info (processed by partners)"], ["Profile Data", "Preferences, wishlist items, order history"]]} />
      <h3>Automatically Collected</h3>
      <Terms items={[["Device Info", "Browser type, OS, device type"], ["Usage Data", "Pages visited, time spent, click patterns"], ["Location Data", "IP address, approximate geographic location"]]} />

      <h2 id="use">How We Use Your Information</h2>
      <ul>
        {["Process and fulfill your orders", "Send order confirmations and shipping updates", "Handle returns, refunds, and exchanges", "Provide customer support", "Send promotional emails (with consent)", "Analyze website usage to improve services", "Personalize your shopping experience", "Prevent fraud and ensure security"].map((item) => <li key={item}>{item}</li>)}
      </ul>

      <h2 id="share">Information Sharing</h2>
      <p>We may share your information with trusted partners only as necessary:</p>
      <Terms items={[["Payment Processors", "Razorpay for secure payment processing"], ["Shipping Partners", "Courier services for order delivery"], ["Analytics Providers", "Google Analytics for website analysis"]]} />
      <p>We <strong>never</strong> sell, rent, or trade your personal information to third parties for their marketing purposes.</p>

      <h2 id="security">Data Security</h2>
      <Terms items={[["SSL/TLS Encryption", "All data transmitted is encrypted end-to-end"], ["Secure Servers", "Protected by firewalls and intrusion detection"], ["PCI Compliance", "Our payment partners are PCI-DSS certified"], ["No Card Storage", "We never store complete card details on our servers"]]} />

      <h2 id="cookies">Cookies</h2>
      <p>We use cookies and similar tracking technologies to enhance your experience:</p>
      <Terms items={[["Essential", "Required for basic website functionality"], ["Preference", "Remember your settings and preferences"], ["Analytics", "Help us understand how visitors use our website"]]} />

      <h2 id="rights">Your Rights</h2>
      <Terms items={[["Access", "Request a copy of the personal data we hold about you"], ["Correction", "Request correction of inaccurate or incomplete data"], ["Deletion", "Request deletion of your personal data from our systems"], ["Opt-out", "Unsubscribe from marketing communications at any time"]]} />

      <h2 id="payment">Payment &amp; Refund Security</h2>
      <p><strong>Razorpay — PCI-DSS Level 1 Certified.</strong> We support UPI, Credit/Debit Cards, Net Banking, and Wallets. All transactions are encrypted and secure.</p>
      <Terms items={[["Prepaid Orders", "Full refund to original payment method within 5–7 business days"], ["Cash on Delivery", "No refund applicable as payment is collected on delivery"]]} />
      <p>See our <Link href="/returns">Returns &amp; Refunds</Link> page for the full refund policy.</p>

      <h2 id="children">Children&apos;s Privacy</h2>
      <p>Our website is not intended for children under 18 years of age. We do not knowingly collect personal information from children. If you believe we have collected data from a minor, please contact us immediately.</p>

      <h2 id="changes">Changes to This Policy</h2>
      <p>We may update this privacy policy from time to time. Any changes will be posted on this page with an updated revision date. We encourage you to review this policy periodically.</p>

      <h2 id="contact-us">Contact Us</h2>
      <p>If you have any questions about this Privacy Policy, please contact us at <a href={`mailto:${email}`}>{email}</a>{phone && <> or <a href={`tel:${phone.replace(/[^0-9+]/g, "")}`}>{phone}</a></>}.</p>
    </LegalPage>
  );
}
