import { DESCRIPTION_RANGE, TITLE_RANGE } from "./seo-pages";

// The SEO checks for one URL, shared by every admin screen that edits SEO and by the AI writer, so a score of 100
// means the same thing everywhere. Runs in the browser too: no database or server imports here.

export type SeoCheckInput = {
  title: string;
  description: string;
  focusKeyword: string;
  /** Path of the URL, e.g. "/product/pearl-claw-clip". */
  path: string;
  image: string;
  noindex: boolean;
  /** Lower-cased titles and descriptions of every other indexable URL. */
  otherTitles: string[];
  otherDescriptions: string[];
};

export type SeoCheckId = "title_length" | "desc_length" | "title_unique" | "desc_unique" | "kw_title" | "kw_desc" | "kw_url" | "kw_start" | "image" | "indexed";
/** ok is null when the check can't run yet (no focus keyword) or doesn't apply (the home page has no words in its URL). */
export type SeoCheck = { id: SeoCheckId; ok: boolean | null; text: string };

/** The words of a URL path a focus keyword can be built from: "/product/pearl-claw-clip" → ["pearl", "claw", "clip"]. */
export const urlWords = (path: string) => (path.split("/").filter(Boolean).pop() ?? "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

const slugOf = (text: string) => text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).join("-");

export function seoChecks(i: SeoCheckInput): { checks: SeoCheck[]; score: number } {
  const title = i.title.trim();
  const description = i.description.trim();
  const t = title.toLowerCase();
  const kw = i.focusKeyword.trim().toLowerCase();
  const slug = urlWords(i.path).join("-");
  const at = kw ? t.indexOf(kw) : -1;
  const checks: SeoCheck[] = [
    { id: "title_length", ok: title.length >= TITLE_RANGE[0] && title.length <= TITLE_RANGE[1], text: `Title is ${TITLE_RANGE[0]}–${TITLE_RANGE[1]} characters (${title.length})` },
    { id: "desc_length", ok: description.length >= DESCRIPTION_RANGE[0] && description.length <= DESCRIPTION_RANGE[1], text: `Description is ${DESCRIPTION_RANGE[0]}–${DESCRIPTION_RANGE[1]} characters (${description.length})` },
    { id: "title_unique", ok: !!title && !i.otherTitles.includes(t), text: "Title is unique across the site" },
    { id: "desc_unique", ok: !!description && !i.otherDescriptions.includes(description.toLowerCase()), text: "Description is unique across the site" },
    { id: "kw_title", ok: kw ? at >= 0 : null, text: "Focus keyword appears in the title" },
    { id: "kw_desc", ok: kw ? description.toLowerCase().includes(kw) : null, text: "Focus keyword appears in the description" },
    { id: "kw_url", ok: kw && slug ? `-${slug}-`.includes(`-${slugOf(kw)}-`) : null, text: slug ? "Focus keyword appears in the URL" : "Focus keyword appears in the URL (not needed for the home page)" },
    { id: "kw_start", ok: kw ? at >= 0 && at <= title.length / 2 : null, text: "Focus keyword is near the start of the title" },
    { id: "image", ok: !!i.image.trim(), text: "Has a social share image" },
    { id: "indexed", ok: !i.noindex, text: "Visible to search engines" },
  ];
  const scored = checks.filter((c) => c.ok !== null);
  // Without a focus keyword the keyword checks count as failed, so an unset keyword can never reach 100.
  const total = kw ? scored.length : scored.length + (slug ? 4 : 3);
  const score = total ? Math.round((scored.filter((c) => c.ok).length / total) * 100) : 0;
  return { checks, score };
}

/** The checks the writer (a person or the AI) controls, still failing, as plain instructions for another attempt. */
export function textProblems(checks: SeoCheck[]): string[] {
  const fix: Partial<Record<SeoCheckId, string>> = {
    title_length: `The title must be ${TITLE_RANGE[0]} to ${TITLE_RANGE[1]} characters long, counting spaces.`,
    desc_length: `The description must be ${DESCRIPTION_RANGE[0]} to ${DESCRIPTION_RANGE[1]} characters long, counting spaces.`,
    title_unique: "The title is already used by another page. Write a different one.",
    desc_unique: "The description is already used by another page. Write a different one.",
    kw_title: "The title must contain the focus keyword exactly as written.",
    kw_desc: "The description must contain the focus keyword exactly as written.",
    kw_url: "The focus keyword must be consecutive words taken from the URL words, in the same order.",
    kw_start: "The title must start with the focus keyword.",
  };
  return checks.filter((c) => c.ok === false && fix[c.id]).map((c) => `${fix[c.id]} (${c.text})`);
}
