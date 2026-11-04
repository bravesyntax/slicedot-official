import SeoShell from "@/components/admin/SeoShell";
import SeoTargetList from "@/components/admin/SeoTargetList";
import { loadSeoTargets } from "@/lib/admin/seo-audit";

export const metadata = { title: "SEO · Products" };

type Props = { searchParams: Promise<{ filter?: string }> };

export default async function Page({ searchParams }: Props) {
  const [{ filter = "all" }, { targets }] = await Promise.all([searchParams, loadSeoTargets("product")]);
  return (
    <SeoShell active="products">
      <SeoTargetList targets={targets} title="Products" description="Defaults come from each product's name, description and main image. Inactive products are never indexed." filter={filter} baseHref="/admin/seo/products" />
    </SeoShell>
  );
}
