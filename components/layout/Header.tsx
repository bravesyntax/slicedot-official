"use client";

import { ChevronDown, Heart, LogOut, Menu, Search, ShoppingBag, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { logout } from "@/app/(site)/auth/actions";
import { setCartOpen, useCustomer } from "@/components/account/customer-store";
import CartDrawer from "@/components/cart/CartDrawer";
import Logo from "@/components/Logo";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggler } from "@/components/velora/theme-toggler";
import type { NavItem } from "@/lib/navigation";
import { categoryUrl, formatPrice, productImage, productUrl } from "@/lib/routes";

const ACCOUNT_LINKS = [
  ["/account?tab=profile", "My Profile"],
  ["/account?tab=orders", "Orders"],
  ["/account?tab=addresses", "Addresses"],
  ["/account?tab=wishlist", "Wishlist"],
];

type Suggestions = { products: { name: string; slug: string; price: string; image: string | null }[]; categories: { name: string; slug: string }[] };

const linkClass =
  "rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function setThemeCookie(dark: boolean) {
  document.cookie = `theme=${dark ? "dark" : "light"};path=/;max-age=31536000;SameSite=Lax`;
}

// Mega menus only open when a section has links: most of the menu's sections have none yet.
const withLinks = (item: NavItem) => item.sections.filter((s) => s.items.length > 0);

export default function Header({ navigation, suggestedSearches }: { navigation: NavItem[]; suggestedSearches: string[] }) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [isDark, setIsDark] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const { customer, wishlist, cart } = useCustomer();
  const signOut = async () => {
    await logout();
    // A full page load, so the header forgets the signed-out customer.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/");
  };
  useEffect(() => setIsDark(document.documentElement.classList.contains("dark")), []);

  const toggleTheme = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    setThemeCookie(next);
    setIsDark(next);
  };

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then(setSuggestions)
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const search = (term: string) => {
    const q = term.trim();
    if (!q) return;
    setSearchOpen(false);
    router.push(`/products?search=${encodeURIComponent(q)}`);
  };
  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    search(query);
  };

  return (
    <>
    <p className="bg-neutral-950 px-4 py-2 text-center text-xs font-medium text-white">Free shipping on orders of ₹499+ <span className="hidden sm:inline"><span aria-hidden="true" className="mx-1.5 opacity-50">·</span> Cash on Delivery available <span aria-hidden="true" className="mx-1.5 opacity-50">·</span> Easy 7-day returns</span></p>
    <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-md">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-5 sm:px-6 lg:px-8">
        <Link href="/" aria-label="SliceDot home" className="flex shrink-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Logo className="h-9" priority />
        </Link>


          <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
            <SheetTrigger asChild>
              <button type="button" aria-label="Search products" className="ml-auto grid size-10 shrink-0 place-items-center rounded-lg text-foreground transition-colors hover:bg-muted md:mx-auto md:flex md:h-10 md:w-full md:max-w-xl md:flex-1 md:items-center md:justify-start md:gap-2 md:rounded-full md:border md:bg-muted/50 md:px-4 md:text-sm md:text-muted-foreground">
                <Search aria-hidden="true" className="size-5 md:size-4" />
                <span className="hidden md:inline">Search for products and categories</span>
              </button>
            </SheetTrigger>
            <SheetContent
              side="top"
              onOpenAutoFocus={(e) => {
                e.preventDefault();
                searchInput.current?.focus();
              }}
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Search</SheetTitle>
                <SheetDescription>Search the store&apos;s products</SheetDescription>
              </SheetHeader>
              <div className="mx-auto w-full max-w-2xl px-5 py-6">
                <form onSubmit={onSearch} role="search">
                  <Input ref={searchInput} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products..." aria-label="Search products" autoComplete="off" className="h-11" />
                </form>
                {suggestions ? (
                  <div className="mt-4 max-h-[60vh] overflow-y-auto" aria-live="polite">
                    {suggestions.categories.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {suggestions.categories.map((c) => (
                          <Link key={c.slug} href={categoryUrl(c.slug)} onClick={() => setSearchOpen(false)} className="rounded-full border bg-card px-3 py-1.5 text-sm transition-colors hover:border-primary hover:text-primary">{c.name}</Link>
                        ))}
                      </div>
                    )}
                    <ul className="grid gap-1">
                      {suggestions.products.map((p) => (
                        <li key={p.slug}>
                          <Link href={productUrl(p.slug)} onClick={() => setSearchOpen(false)} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted">
                            <span className="relative size-11 shrink-0 overflow-hidden rounded-md border bg-white">
                              {p.image && <Image src={productImage(p.image)} alt="" fill sizes="44px" className="object-contain" />}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                            <span className="text-sm font-medium">{formatPrice(p.price)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    {suggestions.products.length === 0 && suggestions.categories.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No matches found.</p>}
                  </div>
                ) : (
                  <>
                    <p className="mt-5 text-sm font-medium text-muted-foreground">Popular searches</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {suggestedSearches.map((term) => (
                        <button key={term} type="button" onClick={() => search(term)} className="rounded-full border bg-card px-4 py-2 text-sm transition-colors hover:border-primary hover:text-primary">
                          {term}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        <div className="flex items-center gap-1">
          <ThemeToggler isDark={isDark} onToggle={toggleTheme} className="hidden sm:grid" />
          {customer ? (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-lg" aria-label="My account" className="hidden sm:inline-flex"><User aria-hidden="true" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuLabel className="font-normal">
                  {customer.name && <p className="truncate font-medium text-foreground">{customer.name}</p>}
                  <p className="truncate text-xs">{customer.email}</p>
                </DropdownMenuLabel>
                {ACCOUNT_LINKS.map(([href, label]) => (
                  <DropdownMenuItem key={href} asChild><a href={href}>{label}</a></DropdownMenuItem>
                ))}
                <DropdownMenuItem onSelect={signOut}><LogOut aria-hidden="true" /> Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="ghost" size="icon-lg" className="hidden sm:inline-flex">
              <Link href="/auth" aria-label="Sign in or create account"><User aria-hidden="true" /></Link>
            </Button>
          )}
          <Button asChild variant="ghost" size="icon-lg" className="relative hidden sm:inline-flex">
            <Link href={customer ? "/account?tab=wishlist" : "/auth?redirect=%2Faccount%3Ftab%3Dwishlist"} aria-label={wishlist.length ? `Wishlist, ${wishlist.length} items` : "Wishlist"}>
              <Heart aria-hidden="true" />
              {wishlist.length > 0 && <span className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground" aria-hidden="true">{wishlist.length}</span>}
            </Link>
          </Button>
          <Button variant="ghost" size="icon-lg" className="relative" aria-label={cart?.count ? `Shopping bag, ${cart.count} items` : "Shopping bag"} onClick={() => setCartOpen(true)}>
            <ShoppingBag aria-hidden="true" />
            {!!cart?.count && <span className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground" aria-hidden="true">{cart.count}</span>}
          </Button>
          <CartDrawer />

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-lg" aria-label="Open menu" className="lg:hidden">
                <Menu aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-sm">
              <SheetHeader className="border-b px-5 py-4">
                <SheetTitle><Logo className="h-8" /></SheetTitle>
                <SheetDescription className="sr-only">Store navigation</SheetDescription>
              </SheetHeader>
              <nav aria-label="Mobile" className="flex-1 px-3 py-3">
                <Accordion type="single" collapsible>
                  {navigation.map((item) => {
                    const sections = withLinks(item);
                    if (!sections.length) {
                      return (
                        <SheetClose asChild key={item.id}>
                          <Link href={item.url ?? "/products"} className="block rounded-lg px-2 py-3 text-base font-medium capitalize hover:bg-muted">
                            {item.title.toLowerCase()}
                          </Link>
                        </SheetClose>
                      );
                    }
                    return (
                      <AccordionItem key={item.id} value={String(item.id)} className="border-b-0">
                        <AccordionTrigger className="rounded-lg px-2 py-3 text-base capitalize hover:bg-muted hover:no-underline">{item.title.toLowerCase()}</AccordionTrigger>
                        <AccordionContent className="pb-2 [&_a]:no-underline">
                          {sections.map((section) => (
                            <div key={section.id} className="pl-2">
                              <p className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground capitalize">{section.title.toLowerCase()}</p>
                              <ul className="grid gap-0.5">
                                {section.items.map((link) => (
                                  <li key={link.id}>
                                    <SheetClose asChild>
                                      <Link href={link.url ?? "/products"} className="block rounded-lg px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
                                        {link.title}
                                      </Link>
                                    </SheetClose>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
                <ul className="mt-2 border-t pt-2">
                  <li>
                    <a href={customer ? "/account" : "/auth"} className="flex items-center gap-2 rounded-lg px-2 py-3 text-base font-medium hover:bg-muted"><User className="size-4" aria-hidden="true" /> {customer ? "My Account" : "Sign In"}</a>
                  </li>
                  <li>
                    <a href={customer ? "/account?tab=wishlist" : "/auth?redirect=%2Faccount%3Ftab%3Dwishlist"} className="flex items-center gap-2 rounded-lg px-2 py-3 text-base font-medium hover:bg-muted"><Heart className="size-4" aria-hidden="true" /> Wishlist{wishlist.length > 0 && ` (${wishlist.length})`}</a>
                  </li>
                  {customer && (
                    <li>
                      <button type="button" onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-2 py-3 text-base font-medium hover:bg-muted"><LogOut className="size-4" aria-hidden="true" /> Sign Out</button>
                    </li>
                  )}
                </ul>
              </nav>
              <div className="flex items-center justify-between border-t px-5 py-4 text-sm text-muted-foreground">
                Theme <ThemeToggler isDark={isDark} onToggle={toggleTheme} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
      <div className="hidden border-t lg:block">
        <ul className="mx-auto flex h-11 max-w-7xl items-center gap-0.5 px-5 sm:px-6 lg:px-8">
          <li><Link href="/products" className={`block whitespace-nowrap font-medium text-foreground ${linkClass}`}>All Products</Link></li>
          {navigation.map((item) => {
            const sections = withLinks(item);
            return (
              <li key={item.id}>
                {sections.length > 0 ? (
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className={`group/menu inline-flex items-center gap-1 whitespace-nowrap capitalize data-[state=open]:bg-muted data-[state=open]:text-foreground ${linkClass}`}>
                        {item.title.toLowerCase()}
                        <ChevronDown aria-hidden="true" className="size-3.5 transition-transform duration-200 group-data-[state=open]/menu:rotate-180 motion-reduce:transition-none" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" sideOffset={14} className="w-[34rem] max-w-(--radix-dropdown-menu-content-available-width) rounded-2xl p-2 shadow-xl shadow-foreground/5">
                      <div className="grid grid-cols-2 gap-2">
                        {sections.map((section) => (
                          <div key={section.id}>
                            <DropdownMenuLabel className="px-2.5 pt-2 pb-1 capitalize">{section.title.toLowerCase()}</DropdownMenuLabel>
                            {section.items.map((link) => (
                              <DropdownMenuItem key={link.id} asChild className="rounded-lg px-2.5 py-2">
                                <Link href={link.url ?? "/products"}>{link.title}</Link>
                              </DropdownMenuItem>
                            ))}
                          </div>
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link href={item.url ?? "/products"} className={`block whitespace-nowrap capitalize ${linkClass}`}>
                    {item.title.toLowerCase()}
                  </Link>
                )}
              </li>
            );
          })}
          <li className="ml-auto"><Link href="/products?sort=newest" className={`block whitespace-nowrap ${linkClass}`}>New Arrivals</Link></li>
          <li><Link href="/products?sort=discount&discount=10" className={`block whitespace-nowrap font-medium text-destructive ${linkClass}`}>Deals</Link></li>
        </ul>
      </div>
    </header>
    </>
  );
}
