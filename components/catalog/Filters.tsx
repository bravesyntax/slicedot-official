"use client";

import { SlidersHorizontal, Star } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DISCOUNTS, PRICE_RANGES, RATINGS, SORTS } from "@/lib/listing";
import { categoryUrl } from "@/lib/routes";
import { cn } from "@/lib/utils";

export type FilterCategory = { id: number; name: string; slug: string; depth: number; product_count: number };
type FilterProps = { categories: FilterCategory[]; colors: { name: string; code: string }[]; activeCategory?: string };

const FILTER_KEYS = ["price", "color", "rating", "discount", "in_stock", "featured", "tag", "collection"];

function useQuery() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  // Any change goes back to the first page: the old page number may not exist in the new results.
  const push = (next: URLSearchParams) => {
    next.delete("page");
    const text = next.toString();
    startTransition(() => router.push(text ? `${pathname}?${text}` : pathname, { scroll: false }));
  };
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    push(next);
  };
  const toggleInList = (key: string, value: string) => {
    const current = (params.get(key) ?? "").split(",").filter(Boolean);
    set(key, (current.includes(value) ? current.filter((v) => v !== value) : [...current, value]).join(","));
  };
  const clear = () => {
    const next = new URLSearchParams(params);
    FILTER_KEYS.forEach((key) => next.delete(key));
    push(next);
  };
  return { params, set, toggleInList, clear };
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-b pb-5 last:border-b-0">
      <legend className="pb-3 text-sm font-medium">{title}</legend>
      <div className="grid gap-2.5">{children}</div>
    </fieldset>
  );
}

function Option({ id, checked, onChange, children }: { id: string; checked: boolean; onChange: () => void; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <Checkbox id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="flex-1 cursor-pointer gap-2 font-normal text-muted-foreground">{children}</Label>
    </div>
  );
}

function FilterPanel({ categories, colors, activeCategory, idPrefix }: FilterProps & { idPrefix: string }) {
  const { params, set, toggleInList, clear } = useQuery();
  const inList = (key: string, value: string) => (params.get(key) ?? "").split(",").includes(value);
  const active = FILTER_KEYS.some((key) => params.get(key));
  const keep = new URLSearchParams(params);
  keep.delete("page");
  const suffix = keep.toString() ? `?${keep}` : "";

  return (
    <div className="grid gap-5">
      {active && <Button variant="outline" size="sm" onClick={clear} className="rounded-full">Clear filters</Button>}
      <Group title="Category">
        <Link href={`/products${suffix}`} scroll={false} className={cn("text-sm transition-colors hover:text-foreground", activeCategory ? "text-muted-foreground" : "font-medium text-foreground")}>All Products</Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`${categoryUrl(c.slug)}${suffix}`}
            scroll={false}
            style={{ paddingLeft: c.depth * 12 }}
            className={cn("flex justify-between gap-2 text-sm transition-colors hover:text-foreground", activeCategory === c.slug ? "font-medium text-foreground" : "text-muted-foreground")}
          >
            <span>{c.name}</span> <span className="text-xs tabular-nums">{c.product_count}</span>
          </Link>
        ))}
      </Group>
      <Group title="Price">
        {PRICE_RANGES.map((r) => (
          <Option key={r.value} id={`${idPrefix}-price-${r.value}`} checked={inList("price", r.value)} onChange={() => toggleInList("price", r.value)}>{r.label}</Option>
        ))}
      </Group>
      {colors.length > 0 && (
        <Group title="Color">
          {colors.map((c) => (
            <Option key={c.name} id={`${idPrefix}-color-${c.name}`} checked={inList("color", c.name)} onChange={() => toggleInList("color", c.name)}>
              <span className="size-3.5 rounded-full border" style={{ backgroundColor: c.code }} /> {c.name}
            </Option>
          ))}
        </Group>
      )}
      <Group title="Customer Rating">
        {RATINGS.map((n) => (
          <Option key={n} id={`${idPrefix}-rating-${n}`} checked={params.get("rating") === String(n)} onChange={() => set("rating", params.get("rating") === String(n) ? "" : String(n))}>
            {n} <Star className="size-3 fill-warning text-warning" aria-hidden="true" /> &amp; above
          </Option>
        ))}
      </Group>
      <Group title="Discount">
        {DISCOUNTS.map((n) => (
          <Option key={n} id={`${idPrefix}-discount-${n}`} checked={params.get("discount") === String(n)} onChange={() => set("discount", params.get("discount") === String(n) ? "" : String(n))}>{n}% off or more</Option>
        ))}
      </Group>
      <Group title="Availability">
        <Option id={`${idPrefix}-stock`} checked={params.get("in_stock") === "1"} onChange={() => set("in_stock", params.get("in_stock") === "1" ? "" : "1")}>In stock only</Option>
      </Group>
    </div>
  );
}

export function SidebarFilters(props: FilterProps) {
  return <aside className="scrollbar-hide hidden lg:sticky lg:top-32 lg:block lg:max-h-[calc(100svh-9rem)] lg:overflow-y-auto" aria-label="Filters"><FilterPanel {...props} idPrefix="side" /></aside>;
}

export function MobileFilters(props: FilterProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="rounded-full lg:hidden"><SlidersHorizontal aria-hidden="true" /> Filters</Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full overflow-y-auto sm:max-w-sm">
        <SheetHeader className="border-b">
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription className="sr-only">Narrow down the products shown</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6"><FilterPanel {...props} idPrefix="sheet" /></div>
      </SheetContent>
    </Sheet>
  );
}

export function SortSelect({ value, searching = false }: { value: string; searching?: boolean }) {
  const { set } = useQuery();
  const fallback = searching ? "relevance" : "newest";
  return (
    <Select value={value} onValueChange={(v) => set("sort", v === fallback ? "" : v)}>
      <SelectTrigger aria-label="Sort products" className="w-48 rounded-full"><SelectValue /></SelectTrigger>
      <SelectContent>
        {SORTS.filter(([key]) => searching || key !== "relevance").map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
