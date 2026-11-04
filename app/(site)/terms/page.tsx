import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/layout/LegalPage";
import { RelatedLinks } from "@/components/site/ui";
import { getStoreSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Read the terms and conditions for using SliceDot.",
  alternates: { canonical: "/terms" },
};

const CONTENTS: [string, string][] = [
  ["introduction", "Introduction"], ["eligibility", "Eligibility"], ["account", "Account Registration"], ["products", "Products & Pricing"], ["orders", "Orders & Payment"],
  ["shipping", "Shipping & Delivery"], ["returns", "Returns & Refunds"], ["intellectual", "Intellectual Property"], ["liability", "Limitation of Liability"], ["contact", "Contact Information"],
];

const List = ({ items }: { items: string[] }) => <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>;

export default async function TermsPage() {
  const { name, email } = await getStoreSettings();
  return (
    <>
      <LegalPage title="Terms & Conditions" lead="Please read these terms carefully. By using our services, you agree to be bound by the following conditions." updated="December 2024" contents={CONTENTS}>
        <h2 id="introduction">Introduction</h2>
        <p>Welcome to <strong>{name}</strong>. These Terms and Conditions govern your use of our website and the purchase of products from our online store. By accessing or using our website, you agree to be bound by these Terms.</p>
        <p>We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting to the website. Your continued use of the site following any changes constitutes acceptance of those changes.</p>

        <h2 id="eligibility">Eligibility</h2>
        <p>To use our services, you must meet the following requirements:</p>
        <List items={["Be at least 18 years of age or have parental/guardian consent", "Provide accurate and complete information during registration", "Be legally capable of entering into binding contracts", "Not be barred from receiving services under applicable laws"]} />

        <h2 id="account">Account Registration</h2>
        <p>When you create an account with us, you agree to:</p>
        <List items={["Provide accurate, current, and complete information", "Maintain the security of your password and account", "Accept responsibility for all activities under your account", "Notify us immediately of any unauthorized use"]} />
        <p>We reserve the right to suspend or terminate accounts that violate these terms or engage in fraudulent activity.</p>

        <h2 id="products">Products &amp; Pricing</h2>
        <p>We strive to provide accurate product descriptions and pricing. However, we do not warrant that product descriptions, pricing, or other content is accurate, complete, or error-free.</p>
        <List items={["All prices are in Indian Rupees (INR) unless otherwise stated", "Prices are subject to change without notice", "We reserve the right to correct pricing errors", "Product images are for illustration purposes only"]} />

        <h2 id="orders">Orders &amp; Payment</h2>
        <p>By placing an order, you are making an offer to purchase products. We reserve the right to:</p>
        <List items={["Accept or decline any order at our discretion", "Cancel orders due to pricing errors or product unavailability", "Limit quantities purchased per person or per order"]} />
        <p>Payment must be made at the time of order through our accepted payment methods. All transactions are processed securely through our payment partners.</p>

        <h2 id="shipping">Shipping &amp; Delivery</h2>
        <p>Delivery times are estimates and not guaranteed. We are not responsible for delays caused by shipping carriers, customs, or other factors beyond our control.</p>
        <p>Risk of loss and title for items pass to you upon delivery. Please inspect your order upon receipt and report any damage or discrepancies immediately.</p>
        <p>For detailed shipping information, visit our <Link href="/shipping">Shipping Policy</Link> page.</p>

        <h2 id="returns">Returns &amp; Refunds</h2>
        <p>We want you to be completely satisfied with your purchase. If you are not satisfied, you may return eligible items within the specified return window.</p>
        <p>For detailed return and refund information, visit our <Link href="/returns">Returns Policy</Link> page.</p>

        <h2 id="intellectual">Intellectual Property</h2>
        <p>All content on this website, including text, graphics, logos, images, and software, is the property of <strong>{name}</strong> or its content suppliers and is protected by intellectual property laws.</p>
        <p>You may not reproduce, distribute, modify, or create derivative works from any content without our express written permission.</p>

        <h2 id="liability">Limitation of Liability</h2>
        <p>To the fullest extent permitted by law, <strong>{name}</strong> shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our website or products.</p>
        <p>Our total liability shall not exceed the amount paid by you for the specific product or service giving rise to the claim.</p>

        <h2 id="contact">Contact Information</h2>
        <p>If you have any questions about these Terms and Conditions, please contact us at <a href={`mailto:${email}`}>{email}</a> or visit our <Link href="/contact">Contact Page</Link>.</p>
      </LegalPage>
      <RelatedLinks title="Related policies" links={[["Privacy Policy", "/privacy-policy"], ["Returns Policy", "/returns"], ["Shipping Policy", "/shipping"]]} />
    </>
  );
}
