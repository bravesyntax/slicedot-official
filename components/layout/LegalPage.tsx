import type { ReactNode } from "react";
import { PageHero } from "@/components/site/ui";
import { TracingBeam } from "@/components/velora/tracing-beam";

/** Long-form legal page: hero, then the text with a contents list. Headings need ids matching `contents`. */
export default function LegalPage({ title, lead, updated, contents, children }: { title: string; lead: string; updated?: string; contents: [string, string][]; children: ReactNode }) {
  return (
    <>
      <PageHero eyebrow="Legal" title={title}>
        {lead}
        {updated && <span className="mt-2 block text-sm">Last updated: {updated}</span>}
      </PageHero>
      <section className="mx-auto grid max-w-6xl gap-10 px-5 pb-20 sm:px-6 lg:grid-cols-[14rem_1fr] lg:px-8">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <nav aria-label="On this page" className="rounded-2xl border bg-card p-4">
            <p className="text-sm font-medium">On this page</p>
            <ol className="mt-2 grid gap-1 text-sm sm:grid-cols-2 lg:grid-cols-1">
              {contents.map(([id, label], i) => (
                <li key={id}>
                  <a href={`#${id}`} className="flex gap-2 rounded-md py-1 text-muted-foreground transition-colors hover:text-foreground">
                    <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span> {label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>
        <TracingBeam>
          <article className="rich-text [&_h2]:scroll-mt-24">{children}</article>
        </TracingBeam>
      </section>
    </>
  );
}
