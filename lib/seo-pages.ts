// Every fixed public page the SEO manager controls, with its built-in defaults. Values saved in Admin → SEO override these.
export type SeoPageDef = { slug: string; label: string; path: string; title: string; description: string; changeFrequency: "daily" | "weekly" | "monthly"; priority: number };

export const SEO_PAGES: SeoPageDef[] = [
  { slug: "home", label: "Home", path: "/", title: "SliceDot | Jewellery, Beauty and Home Essentials Online", description: "Shop jewellery, beauty, fashion accessories, home and phone essentials at SliceDot. Free shipping above ₹499, 7-day returns and Cash on Delivery across India.", changeFrequency: "daily", priority: 1 },
  { slug: "products", label: "All products", path: "/products", title: "Shop All Products Online", description: "Browse every product at SliceDot: jewellery, beauty, fashion, home, kitchen and phone accessories. Free shipping above ₹499 and Cash on Delivery.", changeFrequency: "daily", priority: 0.9 },
  { slug: "categories", label: "Categories", path: "/categories", title: "Shop by Category: Jewellery, Beauty, Home", description: "Find what you need faster. Browse SliceDot categories for jewellery, beauty, fashion accessories, home, kitchen, perfumes and phone accessories.", changeFrequency: "weekly", priority: 0.8 },
  { slug: "about", label: "About", path: "/about", title: "About SliceDot: Everyday Essentials Store", description: "SliceDot is an online store from India for jewellery, beauty, fashion, home and phone essentials. Read our story and how we choose what we sell.", changeFrequency: "monthly", priority: 0.6 },
  { slug: "contact", label: "Contact", path: "/contact", title: "Contact SliceDot: Orders, Returns and Help", description: "Questions about an order, a return or a product? Contact SliceDot customer support by email or phone, or send us a message through the form.", changeFrequency: "monthly", priority: 0.6 },
  { slug: "faq", label: "FAQ", path: "/faq", title: "Frequently Asked Questions: Orders and Delivery", description: "Answers about ordering at SliceDot: delivery times, shipping charges, Cash on Delivery, payments, returns, refunds and tracking your order.", changeFrequency: "monthly", priority: 0.5 },
  { slug: "shipping", label: "Shipping", path: "/shipping", title: "Shipping Information: Delivery Times and Charges", description: "SliceDot ships across India in 3 to 7 business days. Free shipping on orders of ₹499 and above; a small fee applies below that. Cash on Delivery available.", changeFrequency: "monthly", priority: 0.4 },
  { slug: "returns", label: "Returns", path: "/returns", title: "Returns and Refund Policy: 7-Day Easy Returns", description: "Return unused items in original packaging within 7 days of delivery. Read how SliceDot returns, exchanges and refunds work, and how long they take.", changeFrequency: "monthly", priority: 0.4 },
  { slug: "privacy-policy", label: "Privacy policy", path: "/privacy-policy", title: "Privacy Policy: How SliceDot Uses Your Data", description: "How SliceDot collects, uses and protects your personal information when you shop with us, and the choices you have about your data.", changeFrequency: "monthly", priority: 0.3 },
  { slug: "terms", label: "Terms", path: "/terms", title: "Terms and Conditions for Shopping at SliceDot", description: "The terms that apply when you browse and buy at SliceDot: orders, pricing, payments, delivery, returns, accounts and the use of this website.", changeFrequency: "monthly", priority: 0.3 },
];

export const seoPageDef = (slug: string) => SEO_PAGES.find((p) => p.slug === slug);

/** Recommended lengths; the editor and audit warn outside them. */
export const TITLE_RANGE = [30, 60] as const;
export const DESCRIPTION_RANGE = [120, 160] as const;
