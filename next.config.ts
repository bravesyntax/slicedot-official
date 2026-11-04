import type { NextConfig } from "next";

// Pages that live at /pages/<name>.php on the PHP site. Add each one here as its Next.js route is ported, so a
// redirect never points at a page that doesn't exist yet. /product/<slug> and /category/<slug> keep their URLs.
const LEGACY_PAGES = ["about", "contact", "faq", "shipping", "returns", "terms", "products", "categories", "auth", "account", "cart"];

// Same baseline as the PHP .htaccess plus a minimal CSP. No script-src or frame-src, because Razorpay Checkout loads its
// script and frames from its own domains.
const CSP = ["object-src 'none'", "base-uri 'self'", "frame-ancestors 'self'", "upgrade-insecure-requests"].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Images uploaded through the admin will live in Vercel Blob (public store).
  images: { remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }] },
  async redirects() {
    return [
      ...LEGACY_PAGES.map((p) => ({ source: `/pages/${p}.php`, destination: `/${p}`, permanent: true })),
      { source: "/index.php", destination: "/", permanent: true },
      { source: "/sitemap.php", destination: "/sitemap.xml", permanent: true },
      { source: "/sitemap-index.xml", destination: "/sitemap.xml", permanent: true },
      { source: "/pages/logout.php", destination: "/", permanent: true },
      { source: "/pages/wishlist.php", destination: "/account?tab=wishlist", permanent: true },
      { source: "/pages/privacy.php", destination: "/privacy-policy", permanent: true },
      { source: "/pages/privacy-policy.php", destination: "/privacy-policy", permanent: true },
      { source: "/pages/checkout-address.php", destination: "/checkout/address", permanent: true },
      { source: "/pages/checkout-payment.php", destination: "/checkout/payment", permanent: true },
      // These took an order id; the orders list is the safe place for an old link to land.
      { source: "/pages/order-confirmation.php", destination: "/account?tab=orders", permanent: true },
      { source: "/pages/order-detail.php", destination: "/account?tab=orders", permanent: true },
      { source: "/api/download-invoice.php", destination: "/account?tab=orders", permanent: true },
      // pages/refund-policy.php held the privacy policy under a refund title; the refund policy is on /returns.
      { source: "/pages/refund-policy.php", destination: "/returns", permanent: true },
      { source: "/refund-policy", destination: "/returns", permanent: true },
    ];
  },
  async headers() {
    return [
      // Admin and API responses are private: never cached by browsers or proxies, never indexed.
      ...["/admin/:path*", "/admin", "/api/:path*", "/account", "/auth", "/cart", "/checkout/:path*", "/order/:path*", "/invoice/:path*"].map((source) => ({
        source,
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      })),
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
