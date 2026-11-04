import type { Metadata } from "next";
import Analytics from "@/components/layout/Analytics";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import SeoTagCloud from "@/components/layout/SeoTagCloud";
import { ScrollProgress } from "@/components/velora/scroll-progress";
import { getSuggestedSearches } from "@/lib/catalog";
import { getNavigation } from "@/lib/navigation";
import { getSeoSettings } from "@/lib/settings";

// Menus, footer and store details come from the database; refreshed in the background every 5 minutes.
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoSettings();
  return {
    verification: {
      google: seo.googleVerification || undefined,
      other: seo.bingVerification ? { "msvalidate.01": seo.bingVerification } : undefined,
    },
  };
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [navigation, suggested] = await Promise.all([getNavigation(), getSuggestedSearches()]);
  return (
    <>
      <ScrollProgress className="z-60" />
      <Header navigation={navigation} suggestedSearches={suggested.map((s) => s.term)} />
      <main id="main-content" className="overflow-x-clip">{children}</main>
      <SeoTagCloud />
      <Footer />
      <Analytics />
    </>
  );
}
