import Link from "next/link";
import { getTagCloud, type TagGroup } from "@/lib/catalog";
import TagCloudShell from "./TagCloudShell";

const VISIBLE_GROUPS = 3;

function Group({ group }: { group: TagGroup }) {
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-medium">{group.name}</h3>
      <ul className="flex flex-wrap gap-x-2 gap-y-1">
        {group.tags.map((tag) => (
          <li key={tag.id}>
            <Link href={`/products?search=${encodeURIComponent(tag.tag_name)}`} prefetch={false} data-tag-id={tag.id} className="text-xs text-muted-foreground transition-colors hover:text-foreground">
              {tag.tag_name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function SeoTagCloud() {
  const groups = await getTagCloud();
  if (!groups.length) return null;
  const hidden = groups.slice(VISIBLE_GROUPS);
  return (
    <TagCloudShell>
      <section aria-label="Popular searches" className="border-t bg-muted/20">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 py-8 sm:px-6 lg:px-8">
          <h2 className="text-sm font-semibold">Popular Searches</h2>
          {groups.slice(0, VISIBLE_GROUPS).map((group) => <Group key={group.slug} group={group} />)}
          {hidden.length > 0 && (
            <details>
              <summary className="cursor-pointer text-xs font-medium underline-offset-4 hover:underline">Show {hidden.length} more</summary>
              <div className="mt-4 grid gap-4">
                {hidden.map((group) => <Group key={group.slug} group={group} />)}
              </div>
            </details>
          )}
        </div>
      </section>
    </TagCloudShell>
  );
}
