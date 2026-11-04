import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AuroraBackground } from "@/components/velora/aurora-background";
import { BlurFade } from "@/components/velora/blur-fade";
import { DotPattern } from "@/components/velora/grid-pattern";
import { cn } from "@/lib/utils";

// Shared page-building pieces for the public site, on the Velora UI layout rhythm.

export const container = "mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8";

export function Section({ children, className, muted, id, label }: { children: ReactNode; className?: string; muted?: boolean; id?: string; label?: string }) {
  return (
    <section id={id} aria-label={label} className={cn("relative py-14 sm:py-24 lg:py-28", muted && "bg-muted/40 dark:bg-muted/20", className)}>
      <div className={container}>{children}</div>
    </section>
  );
}

export function SectionHeading({ eyebrow, title, children, center, className }: { eyebrow?: string; title: ReactNode; children?: ReactNode; center?: boolean; className?: string }) {
  return (
    <BlurFade className={cn("max-w-2xl", center && "mx-auto text-center", className)}>
      {eyebrow && <p className="text-sm font-medium text-primary">{eyebrow}</p>}
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance lg:text-4xl">{title}</h2>
      {children && <p className="mt-3 text-pretty text-muted-foreground">{children}</p>}
    </BlurFade>
  );
}

/** Page opener: aurora backdrop with an eyebrow, a title, a lead and optional actions. Pass `background` to replace the aurora. */
export function PageHero({
  eyebrow,
  title,
  children,
  actions,
  background,
  center = true,
  aside,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  background?: ReactNode;
  center?: boolean;
  aside?: ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden">
      {background ?? (
        <>
          <AuroraBackground intensity="subtle" />
          <DotPattern aria-hidden className="absolute inset-0 -z-10 size-full fill-foreground/10 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        </>
      )}
      <div className={cn(container, "relative py-14 sm:py-24 lg:py-28", aside && "grid items-center gap-12 lg:grid-cols-2")}>
        <div className={cn(center && !aside && "mx-auto max-w-3xl text-center", !center && !aside && "max-w-3xl")}>
          {eyebrow && (
            <BlurFade>
              <span className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-sm text-muted-foreground backdrop-blur">{eyebrow}</span>
            </BlurFade>
          )}
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">{title}</h1>
          {children && <div className={cn("mt-6 text-lg text-pretty text-muted-foreground", center && !aside && "mx-auto max-w-2xl")}>{children}</div>}
          {actions && (
            <BlurFade delay={0.2}>
              <div className={cn("mt-8 flex flex-col gap-3 sm:flex-row", center && !aside && "items-center justify-center")}>{actions}</div>
            </BlurFade>
          )}
        </div>
        {aside && <BlurFade delay={0.15}>{aside}</BlurFade>}
      </div>
    </section>
  );
}

/** Large link button, used for page-level calls to action. */
export function CtaLink({ href, children, variant = "default", arrow = true, className }: { href: string; children: ReactNode; variant?: ComponentProps<typeof Button>["variant"]; arrow?: boolean; className?: string }) {
  return (
    <Button asChild variant={variant} className={cn("h-11 rounded-full px-5 text-sm", className)}>
      <Link href={href}>
        {children}
        {arrow && <ArrowRight className="size-4 transition-transform group-hover/button:translate-x-0.5" aria-hidden="true" />}
      </Link>
    </Button>
  );
}

/** Velora's shimmer button as a real link, for the main call to action on a page. */
export function ShimmerLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "group/shimmer relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-full bg-primary px-7 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/30 transition-[transform,box-shadow] duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:scale-100",
        className,
      )}
    >
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
      <span aria-hidden="true" className="motion-safe:animate-shimmer absolute inset-0 bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.35)_50%,transparent_70%)] bg-[length:250%_100%]" />
    </Link>
  );
}

/** Small icon chip used at the top of cards. */
export function IconChip({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg border bg-background text-primary shadow-xs", className)}>{children}</span>;
}

/** A short row of internal links, so a page's related pages are one click away for visitors and crawlers. */
export function RelatedLinks({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <section className={`${container} pb-16`} aria-label={title}>
      <h2 className="text-center text-sm font-medium text-muted-foreground">{title}</h2>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {links.map(([label, href]) => (
          <Link key={href} href={href} className="rounded-full border bg-card px-4 py-2 text-sm transition-colors hover:border-primary hover:text-primary">
            {label}
          </Link>
        ))}
      </div>
    </section>
  );
}
