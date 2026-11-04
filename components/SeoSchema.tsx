import JsonLd from "@/components/JsonLd";
import { customSchema, type SeoEntity } from "@/lib/seo";

/** Custom JSON-LD saved for this URL in Admin → SEO; renders nothing when there is none. */
export default async function SeoSchema({ type, entityKey }: { type: SeoEntity; entityKey: string }) {
  const items = await customSchema(type, entityKey);
  return items.map((data, i) => <JsonLd key={i} data={data} />);
}
