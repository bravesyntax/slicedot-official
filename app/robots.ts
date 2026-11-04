import type { MetadataRoute } from "next";
import { SITE_LIVE, SITE_URL } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  if (!SITE_LIVE) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private pages, and result pages for any typed search or filter, which would otherwise be endless.
      disallow: ["/api/", "/admin/", "/cart", "/checkout/", "/account", "/auth", "/order/", "/invoice/", "/*?*search=", "/*?*price=", "/*?*color=", "/*?*sort="],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
