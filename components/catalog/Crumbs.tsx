import Link from "next/link";
import { Fragment } from "react";
import JsonLd from "@/components/JsonLd";
import { SITE_URL } from "@/lib/config";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

/** Breadcrumb trail; the last entry is the current page and has no link. */
export default function Crumbs({ items }: { items: [string, string?][] }) {
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map(([name, href], i) => ({ "@type": "ListItem", position: i + 1, name, item: href ? `${SITE_URL}${href === "/" ? "" : href}` : undefined })) }} />
      <Breadcrumb>
        <BreadcrumbList>
        {items.map(([label, href], i) => (
          <Fragment key={label}>
            {i > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {href ? <BreadcrumbLink asChild><Link href={href}>{label}</Link></BreadcrumbLink> : <BreadcrumbPage className="line-clamp-1">{label}</BreadcrumbPage>}
            </BreadcrumbItem>
          </Fragment>
        ))}
        </BreadcrumbList>
      </Breadcrumb>
    </>
  );
}
