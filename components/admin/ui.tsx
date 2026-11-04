import Link from "next/link";
import type { ReactNode } from "react";
import { getAdmin } from "@/lib/admin/auth";
import { readFlash } from "@/lib/admin/flash";
import { FlashMessage } from "./client";

// Server-rendered building blocks for admin pages.

export { iconBtnDelete, iconBtnEdit, iconBtnToggle, iconBtnView, inputCls, labelCls, primaryBtn, secondaryBtn, smallPrimaryBtn } from "./styles";

/** Page frame: sticky title bar plus any pending flash message. */
export async function AdminPage({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  const [admin, flash] = await Promise.all([getAdmin(), readFlash()]);
  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b bg-background/80 px-4 py-3.5 backdrop-blur-xl sm:px-6">
        <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
        <div className="flex items-center gap-3">
          {actions}
          <span className="hidden text-xs text-muted-foreground sm:inline">{admin?.username ?? "Admin"}</span>
        </div>
      </header>
      <main className="p-4 sm:p-6">
        {flash && <FlashMessage type={flash.type} message={flash.message} />}
        {children}
      </main>
    </>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`overflow-hidden rounded-xl border bg-card text-card-foreground ${className}`}>{children}</div>;
}

export function CardHead({ title, description, children }: { title: string; description?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function StatGrid({ stats, cols = "grid-cols-2 lg:grid-cols-4" }: { stats: [number | string, string, string?][]; cols?: string }) {
  return (
    <div className={`mb-6 grid gap-4 ${cols}`}>
      {stats.map(([n, label, cls]) => (
        <div key={label} className="rounded-xl border bg-card px-5 py-4">
          <div className={`text-2xl font-semibold tracking-tight ${cls ?? ""}`}>{n}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
        </div>
      ))}
    </div>
  );
}

export function FilterTabs({ tabs, active, hrefFor }: { tabs: [string, string][]; active: string; hrefFor: (key: string) => string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map(([k, label]) => (
        <Link key={k} href={hrefFor(k)} className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${active === k ? "bg-primary font-medium text-primary-foreground" : "border bg-background text-muted-foreground hover:text-foreground"}`}>
          {label}
        </Link>
      ))}
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
      <span aria-hidden="true">&larr;</span> {children}
    </Link>
  );
}

export function Pagination({ page, totalPages, total, perPage, hrefFor }: { page: number; totalPages: number; total: number; perPage: number; hrefFor: (p: number) => string }) {
  if (totalPages <= 1) return null;
  const offset = (page - 1) * perPage;
  const btn = "rounded-lg border bg-background px-3 py-1.5 text-xs hover:bg-muted";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4">
      <span className="text-xs text-muted-foreground">
        Showing {offset + 1}–{Math.min(offset + perPage, total)} of {total}
      </span>
      <div className="flex items-center gap-2">
        {page > 1 && <Link href={hrefFor(page - 1)} className={btn}>Prev</Link>}
        <span className="px-2 text-xs text-muted-foreground">{page} / {totalPages}</span>
        {page < totalPages && <Link href={hrefFor(page + 1)} className={btn}>Next</Link>}
      </div>
    </div>
  );
}

/** On/off switch (a checkbox, so it posts with the form). */
export function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <span className="relative inline-flex items-center">
        <input type="checkbox" name={name} value="1" className="peer sr-only" defaultChecked={defaultChecked} />
        <span className="h-5 w-9 rounded-full bg-muted-foreground/30 transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-background after:transition-transform peer-checked:bg-primary peer-checked:after:translate-x-4 peer-focus-visible:ring-2 peer-focus-visible:ring-ring" />
      </span>
      <span className="text-sm">{label}</span>
    </label>
  );
}

export const Th = ({ children, className = "text-left", hide = "" }: { children?: ReactNode; className?: string; hide?: string }) => (
  <th className={`${className} ${hide} px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground`}>{children}</th>
);

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="px-5 py-16 text-center text-sm text-muted-foreground">{children}</p>;
}

/** Search box that keeps the other filters of the list as hidden fields. */
export function SearchBox({ action, q, placeholder, keep = {} }: { action: string; q: string; placeholder: string; keep?: Record<string, string> }) {
  return (
    <form action={action} className="w-full sm:w-64">
      {Object.entries(keep).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <input name="q" type="search" defaultValue={q} placeholder={placeholder} aria-label={placeholder} className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs focus:border-ring focus:outline-none" />
    </form>
  );
}

/** "3h ago" style relative time. Stored timestamps are UTC without a zone. */
export function timeAgo(d: Date | string | null): string {
  if (!d) return "";
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
  const units: [number, string][] = [[31536000, "y"], [2592000, "mo"], [86400, "d"], [3600, "h"], [60, "m"]];
  for (const [secs, label] of units) if (s >= secs) return `${Math.floor(s / secs)}${label} ago`;
  return "Just now";
}

export const formatDate = (d: Date | string | null) =>
  d ? new Date(d).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) : "";

const PER_PAGE = 25;
/** Page number from the query string, plus the limit and offset that go with it. */
export function paging(pageParam: string | undefined, perPage = PER_PAGE) {
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  return { page, perPage, offset: (page - 1) * perPage, pages: (total: number) => Math.max(1, Math.ceil(total / perPage)) };
}
