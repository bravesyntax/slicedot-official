import "server-only";
import type { SeoTarget } from "./admin/seo-audit";
import type { SeoBrief } from "./ai";
import { seoChecks, textProblems } from "./seo-checks";

// Makes AI-written SEO pass the same checks the admin sees (lib/seo-checks.ts).

/** What the SEO checks still flag after the AI's last attempt: its score, and the failures it can't fix (no share image, noindex). */
export type Scored = { score: number; left: string[] };
export type SeoDraft = { title: string; description: string; focus_keyword: string };

const ATTEMPTS = 3;

/** Asks again, telling the AI what failed, until the SEO checks score 100. Keeps the best attempt. */
export async function untilPerfect<T>(
  write: (brief: SeoBrief) => Promise<T>,
  seo: (copy: T) => SeoDraft,
  page: { path: string; image: string; noindex: boolean; others: SeoTarget[] },
): Promise<T & Scored> {
  const otherTitles = page.others.map((o) => o.seo.title.toLowerCase());
  const otherDescriptions = page.others.map((o) => o.seo.description.toLowerCase());
  let best: (T & Scored) | null = null;
  let feedback: string[] = [];
  for (let i = 0; i < ATTEMPTS; i++) {
    const copy = await write({ path: page.path, avoidTitles: page.others.map((o) => o.seo.title), feedback });
    const d = seo(copy);
    const { checks, score } = seoChecks({ title: d.title, description: d.description, focusKeyword: d.focus_keyword, path: page.path, image: page.image, noindex: page.noindex, otherTitles, otherDescriptions });
    const left = checks.filter((c) => c.ok === false).map((c) => `${c.text}.`);
    if (!best || score > best.score) best = { ...copy, score, left };
    feedback = textProblems(checks);
    if (!feedback.length) break;
  }
  return best!;
}

export const others = (all: SeoTarget[], self?: SeoTarget) => all.filter((t) => t !== self && !t.forcedNoindex && !t.seo.noindex);
