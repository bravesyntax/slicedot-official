"use client";

import { usePathname } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

const PRIVATE_PAGES = ["/cart", "/checkout", "/account", "/auth", "/order"];

/** Leaves the tag cloud off private pages and counts clicks on its links. The links themselves are plain server markup. */
export default function TagCloudShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (PRIVATE_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`))) return null;

  const onClick = (e: MouseEvent) => {
    const id = (e.target as HTMLElement).closest<HTMLElement>("[data-tag-id]")?.dataset.tagId;
    if (id) navigator.sendBeacon(`/api/track-tag?id=${encodeURIComponent(id)}`);
  };
  return <div onClick={onClick}>{children}</div>;
}
