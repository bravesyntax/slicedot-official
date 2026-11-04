"use client";

import {
  ExternalLink, FolderTree, Image as ImageIcon, Inbox, Layers, LayoutDashboard, LogOut, Menu, Moon, Navigation, Package, Search, Settings, ShoppingBag, Star, Users, X, type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logout } from "@/app/admin/login/actions";
import Logo from "@/components/Logo";

export type Badges = { orders: number; reviews: number; messages: number };
type NavItem = [href: string, label: string, icon: LucideIcon, badge?: keyof Badges];

const GROUPS: [title: string, items: NavItem[]][] = [
  ["", [["/admin", "Dashboard", LayoutDashboard], ["/admin/orders", "Orders", ShoppingBag, "orders"], ["/admin/messages", "Messages", Inbox, "messages"]]],
  [
    "Catalog",
    [
      ["/admin/products", "Products", Package],
      ["/admin/categories", "Categories", FolderTree],
      ["/admin/collections", "Collections", Layers],
      ["/admin/media", "Media", ImageIcon],
    ],
  ],
  ["People", [["/admin/customers", "Customers", Users], ["/admin/reviews", "Reviews", Star, "reviews"]]],
  ["SEO & Site", [["/admin/seo", "SEO", Search], ["/admin/navigation", "Navigation", Navigation], ["/admin/settings", "Settings", Settings]]],
];

function toggleTheme() {
  const h = document.documentElement;
  h.classList.toggle("dark");
  document.cookie = `theme=${h.classList.contains("dark") ? "dark" : "light"};path=/;max-age=31536000;SameSite=Lax`;
}

const footerItem = "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

function NavContent({ badges, isActive, onNavigate }: { badges: Badges; isActive: (href: string) => boolean; onNavigate?: () => void }) {
  return (
    <>
      <nav className="flex-1 space-y-6 overflow-y-auto p-4" aria-label="Admin">
        {GROUPS.map(([title, items]) => (
          <div key={title || "main"}>
            {title && <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>}
            <div className="space-y-0.5">
              {items.map(([href, label, Icon, badge]) => {
                const active = isActive(href);
                const count = badge ? badges[badge] : 0;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    {label}
                    {count > 0 && (
                      <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground" aria-label={`${count} waiting`}>
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="space-y-0.5 border-t p-4">
        <button onClick={toggleTheme} className={footerItem}>
          <Moon className="size-4" aria-hidden="true" /> Toggle theme
        </button>
        <a href="/" target="_blank" rel="noopener noreferrer" className={footerItem}>
          <ExternalLink className="size-4" aria-hidden="true" /> View store
        </a>
        <form action={logout}>
          <button type="submit" className={`${footerItem} hover:text-destructive`}>
            <LogOut className="size-4" aria-hidden="true" /> Sign out
          </button>
        </form>
      </div>
    </>
  );
}

const Brand = () => (
  <Link href="/admin" className="inline-flex" aria-label="SliceDot dashboard">
    <Logo className="h-7" />
  </Link>
);

export default function AdminSidebar({ badges }: { badges: Badges }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-card lg:flex">
        <div className="border-b px-6 py-4">
          <Brand />
          <p className="mt-1 text-[11px] text-muted-foreground">Admin panel</p>
        </div>
        <NavContent badges={badges} isActive={isActive} />
      </aside>

      <div className="relative z-50 flex h-14 shrink-0 items-center justify-between border-b bg-card px-4 lg:hidden">
        <Brand />
        <button onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} className="rounded-lg p-2 hover:bg-muted">
          <Menu className="size-5" />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r bg-card">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <Brand />
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-lg p-2 hover:bg-muted">
                <X className="size-5" />
              </button>
            </div>
            <NavContent badges={badges} isActive={isActive} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
