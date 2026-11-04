import SeoShell from "@/components/admin/SeoShell";
import SeoTargetList from "@/components/admin/SeoTargetList";
import { loadSeoTargets } from "@/lib/admin/seo-audit";

export const metadata = { title: "SEO · Categories" };

type Props = { searchParams: Promise<{ filter?: string }> };

export default async function Page({ searchParams }: Props) {
  const [{ filter = "all" }, { targets }] = await Promise.all([searchParams, loadSeoTargets("category")]);
  return (
    <SeoShell active="categories">
      <SeoTargetList targets={targets} title="Categories" description="Defaults come from each category's name, description and image." filter={filter} baseHref="/admin/seo/categories" />
    </SeoShell>
  );
}
