// Every fixed public page the SEO manager controls, with its built-in defaults. Values saved in Admin → SEO override these.
export type SeoPageDef = { slug: string; label: string; path: string; title: string; description: string; changeFrequency: "daily" | "weekly" | "monthly"; priority: number };

export const SEO_PAGES: SeoPageDef[] = [
  { slug: "home", label: "Home", path: "/", title: "SliceDot | Everything You Need, All in One Place", description: "Shop quality products at SliceDot, with free shipping above ₹499, easy returns and Cash on Delivery across India.", changeFrequency: "daily", priority: 1 },
  { slug: "products", label: "All products", path: "/products", title: "All Products", description: "Browse our complete collection of products at SliceDot. Shop by category.", changeFrequency: "daily", priority: 0.9 },
  { slug: "categories", label: "Categories", path: "/categories", title: "Shop by Category", description: "Browse all product categories at SliceDot. Find exactly what you're looking for.", changeFrequency: "weekly", priority: 0.8 },
  { slug: "about", label: "About", path: "/about", title: "About Us", description: "Learn more about SliceDot, our story, mission, and commitment to quality.", changeFrequency: "monthly", priority: 0.6 },
  { slug: "contact", label: "Contact", path: "/contact", title: "Contact Us", description: "Get in touch with SliceDot. We're here to help with any questions or concerns.", changeFrequency: "monthly", priority: 0.6 },
  { slug: "faq", label: "FAQ", path: "/faq", title: "Frequently Asked Questions", description: "Find answers to commonly asked questions about SliceDot.", changeFrequency: "monthly", priority: 0.5 },
  { slug: "shipping", label: "Shipping", path: "/shipping", title: "Shipping Information", description: "Learn about shipping options, delivery times, and charges at SliceDot.", changeFrequency: "monthly", priority: 0.4 },
  { slug: "returns", label: "Returns", path: "/returns", title: "Returns & Refund Policy", description: "Learn about our hassle-free returns and refund policy at SliceDot.", changeFrequency: "monthly", priority: 0.4 },
  { slug: "privacy-policy", label: "Privacy policy", path: "/privacy-policy", title: "Privacy Policy", description: "How SliceDot collects, uses, and protects your personal information.", changeFrequency: "monthly", priority: 0.3 },
  { slug: "terms", label: "Terms", path: "/terms", title: "Terms & Conditions", description: "Read the terms and conditions for using SliceDot.", changeFrequency: "monthly", priority: 0.3 },
];

export const seoPageDef = (slug: string) => SEO_PAGES.find((p) => p.slug === slug);

/** Recommended lengths; the editor and audit warn outside them. */
export const TITLE_RANGE = [30, 60] as const;
export const DESCRIPTION_RANGE = [120, 160] as const;
