"use client";

import { Check, Copy, Mail, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { aiCategoryCopy, aiFaqDrafts, aiFixSeo, aiMessageReply, aiReviewReply, aiSearchFix, applySearchFix } from "@/app/admin/(panel)/ai-tools";
import type { SeoEntity } from "@/lib/seo";
import { SEO_FILL, type SeoFill } from "./SeoBasicsPanel";
import { inputCls, secondaryBtn } from "./styles";

// Small "do it with AI" buttons for the admin screens. They draft; the admin reads, edits and saves.

const field = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null);

function AiButton({ onClick, busy, children, small }: { onClick: () => void; busy: boolean; children: ReactNode; small?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={busy} className={small ? "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-60" : secondaryBtn}>
      <Sparkles className="size-3.5" aria-hidden="true" /> {busy ? "Writing…" : children}
    </button>
  );
}

const Note = ({ text }: { text: string }) => (text ? <p className="text-xs text-muted-foreground" role="status">{text}</p> : null);

/** Fills the reply box of one review (an uncontrolled input with id reply-<id>). */
export function AiReviewReply({ reviewId }: { reviewId: number }) {
  const [busy, start] = useTransition();
  const [note, setNote] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <AiButton small busy={busy} onClick={() => start(async () => {
        setNote("");
        const r = await aiReviewReply(reviewId);
        if (!r.ok) return setNote(r.message);
        const input = field(`reply-${reviewId}`);
        if (input) input.value = r.data;
        setNote("Reply drafted. Edit it if needed, then Save.");
      })}>Draft reply with AI</AiButton>
      <Note text={note} />
    </div>
  );
}

/** Drafts an email answer to a contact message, opened in the admin's own mail app. */
export function AiMessageReply({ messageId, email }: { messageId: number; email: string }) {
  const [busy, start] = useTransition();
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null);
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <AiButton small busy={busy} onClick={() => start(async () => {
          setNote("");
          const r = await aiMessageReply(messageId);
          if (!r.ok) return setNote(r.message);
          setDraft(r.data);
        })}>{draft ? "Write again" : "Draft reply with AI"}</AiButton>
        <Note text={note} />
      </div>
      {draft && (
        <div className="space-y-2 rounded-xl border p-3">
          <input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} aria-label="Subject" className={`${inputCls} text-xs`} />
          <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={7} aria-label="Reply" className={`${inputCls} resize-y text-xs`} />
          <div className="flex flex-wrap gap-2">
            <a href={`mailto:${email}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs hover:bg-muted"><Mail className="size-3.5" aria-hidden="true" /> Open in email</a>
            <button type="button" onClick={() => navigator.clipboard.writeText(draft.body).then(() => setCopied(true))} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs hover:bg-muted">
              {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />} {copied ? "Copied" : "Copy text"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Category form: description plus the SEO box. */
export function AiCategoryWriter({ categoryId }: { categoryId: number | null }) {
  const [busy, start] = useTransition();
  const [note, setNote] = useState("");
  return (
    <div className="space-y-1.5">
      <AiButton small busy={busy} onClick={() => start(async () => {
        setNote("");
        const r = await aiCategoryCopy({ categoryId, name: field("name")?.value ?? "", slug: field("slug")?.value ?? "" });
        if (!r.ok) return setNote(r.message);
        const description = field("description");
        if (description) description.value = r.data.description;
        window.dispatchEvent(new CustomEvent<SeoFill>(SEO_FILL, { detail: { title: r.data.title, description: r.data.meta_description, focus_keyword: r.data.focus_keyword } }));
        setNote(r.data.left.length ? `Done, SEO score ${r.data.score}. Still to fix: ${r.data.left.join(" ")}` : "Done, SEO score 100. Read it, then save.");
      })}>Write with AI</AiButton>
      <Note text={note} />
    </div>
  );
}

/** FAQ screen: five drafts, each added with one click through the normal save. */
export function AiFaqDrafts({ save }: { save: (fd: FormData) => void }) {
  const [busy, start] = useTransition();
  const [note, setNote] = useState("");
  const [drafts, setDrafts] = useState<{ question: string; answer: string }[]>([]);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <AiButton small busy={busy} onClick={() => start(async () => {
          setNote("");
          const r = await aiFaqDrafts();
          if (!r.ok) return setNote(r.message);
          setDrafts(r.data);
          if (!r.data.length) setNote("Nothing new to suggest from the store's policies.");
        })}>Suggest questions with AI</AiButton>
        <Note text={note} />
      </div>
      {drafts.map((d, i) => (
        <form key={i} action={save} className="space-y-2 rounded-xl border p-3">
          <input name="question" defaultValue={d.question} aria-label="Question" className={`${inputCls} text-xs font-medium`} />
          <textarea name="answer" defaultValue={d.answer} rows={3} aria-label="Answer" className={`${inputCls} resize-y text-xs`} />
          <input type="hidden" name="page" value="homepage" />
          <input type="hidden" name="sort_order" value="0" />
          <input type="hidden" name="is_active" value="1" />
          <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs hover:bg-muted"><Check className="size-3.5" aria-hidden="true" /> Add this question</button>
        </form>
      ))}
    </div>
  );
}

/** One search that found nothing: the AI picks matching products, the admin applies the keyword. */
export function AiSearchFix({ term }: { term: string }) {
  const [busy, start] = useTransition();
  const [note, setNote] = useState("");
  const [fix, setFix] = useState<{ keyword: string; reason: string; products: { id: number; name: string }[] } | null>(null);
  const [applied, setApplied] = useState(false);
  return (
    <div className="space-y-2">
      {!applied && (
        <AiButton small busy={busy} onClick={() => start(async () => {
          setNote("");
          const r = await aiSearchFix(term);
          if (!r.ok) return setNote(r.message);
          setFix(r.data);
          if (!r.data.products.length) setNote(`No product fits. ${r.data.reason}`);
        })}>Find matches with AI</AiButton>
      )}
      <Note text={note} />
      {fix && fix.products.length > 0 && !applied && (
        <div className="rounded-xl border p-3 text-xs">
          <p className="text-muted-foreground">{fix.reason}</p>
          <ul className="mt-2 list-disc space-y-0.5 pl-4">{fix.products.map((p) => <li key={p.id}><Link href={`/admin/products/${p.id}`} className="underline underline-offset-4">{p.name}</Link></li>)}</ul>
          <button type="button" disabled={busy} onClick={() => start(async () => {
            const r = await applySearchFix({ keyword: fix.keyword, productIds: fix.products.map((p) => p.id) });
            if (!r.ok) return setNote(r.message);
            setApplied(true);
            setNote(`Added the keyword "${fix.keyword}" to ${r.data} product${r.data === 1 ? "" : "s"}. This search finds them now.`);
          })} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 hover:bg-muted"><Check className="size-3.5" aria-hidden="true" /> Add keyword &quot;{fix.keyword}&quot; to these</button>
        </div>
      )}
    </div>
  );
}

/** SEO lists: rewrites and saves every URL below 100, one at a time, keeping only better results. */
export function AiFixAllSeo({ items }: { items: { type: SeoEntity; key: string; label: string }[] }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [note, setNote] = useState("");
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <AiButton small busy={busy} onClick={() => {
        if (!confirm(`Let AI rewrite and save the SEO title, description and focus keyword of ${items.length} URL${items.length === 1 ? "" : "s"} that score below 100? Only better results are saved.`)) return;
        start(async () => {
          let saved = 0;
          for (const [i, item] of items.entries()) {
            setNote(`${i + 1} of ${items.length}: ${item.label}…`);
            const r = await aiFixSeo(item.type, item.key);
            if (!r.ok) {
              setNote(`Stopped at ${item.label}: ${r.message} ${saved} saved so far.`);
              router.refresh();
              return;
            }
            if (r.data.saved) saved++;
          }
          setNote(`Done. ${saved} of ${items.length} improved and saved.`);
          router.refresh();
        });
      }}>Fix {items.length} with AI</AiButton>
      <Note text={note} />
    </div>
  );
}
