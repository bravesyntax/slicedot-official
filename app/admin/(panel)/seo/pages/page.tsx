import SeoShell from "@/components/admin/SeoShell";
import SeoTargetList from "@/components/admin/SeoTargetList";
import { loadSeoTargets } from "@/lib/admin/seo-audit";

export const metadata = { title: "SEO · Static pages" };

type Props = { searchParams: Promise<{ filter?: string }> };

export default async function Page({ searchParams }: Props) {
  const [{ filter = "all" }, { targets }] = await Promise.all([searchParams, loadSeoTargets("page")]);
  return (
    <SeoShell active="pages">
      <SeoTargetList targets={targets} title="Static pages" description="The fixed pages of the store. Defaults are built in; override anything here." filter={filter} baseHref="/admin/seo/pages" />
    </SeoShell>
  );
}
