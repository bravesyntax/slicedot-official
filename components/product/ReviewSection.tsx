"use client";

import { AlertTriangle, BadgeCheck, CheckCircle2, MessageSquarePlus, Star, ThumbsUp } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { markHelpful, submitReview, type ReviewState } from "@/app/(site)/product/[slug]/actions";
import { useCustomer } from "@/components/account/customer-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DotsLoader } from "@/components/velora/loaders";
import { cn } from "@/lib/utils";

export type ReviewItem = { id: number; customer_name: string; rating: number; title: string | null; review_text: string; verified: boolean; helpful: number; reply: string | null; date: string };

const initial: ReviewState = { status: "idle", errors: [], values: {} };

const Stars = ({ value, className = "size-4" }: { value: number; className?: string }) => (
  <span className="inline-flex gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={cn(className, i <= Math.round(value) ? "fill-warning text-warning" : "fill-muted text-muted")} aria-hidden="true" />)}
  </span>
);

function ReviewForm({ productId, minLength }: { productId: number; minLength: number }) {
  const [state, action, pending] = useActionState(submitReview, initial);
  const { customer } = useCustomer();
  const [rating, setRating] = useState(0);
  const [startedAt, setStartedAt] = useState("");
  useEffect(() => setStartedAt(String(Date.now())), []);
  const v = state.status === "error" ? state.values : {};

  if (state.status === "ok") {
    return (
      <div className="rounded-2xl border bg-card p-6 text-center" role="status">
        <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden="true" />
        <p className="mt-3 text-muted-foreground">{state.message}</p>
      </div>
    );
  }
  const chosen = rating || Number(v.rating) || 0;
  return (
    <form action={action} className="grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2 sm:p-6">
      {state.errors.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 sm:col-span-2" role="alert">
          {state.errors.map((e) => <p key={e} className="flex items-start gap-2 text-sm text-destructive"><AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {e}</p>)}
        </div>
      )}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label>Website<input type="text" name="website_url" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <input type="hidden" name="form_ts" value={startedAt} />
      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="rating" value={chosen || ""} />
      <div className="sm:col-span-2">
        <p className="text-sm font-medium" id="rating-label">Your rating *</p>
        <div className="mt-2 flex gap-1" role="group" aria-labelledby="rating-label">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" aria-label={`${n} star${n > 1 ? "s" : ""}`} aria-pressed={n === chosen} onClick={() => setRating(n)} className="rounded p-0.5 transition-transform hover:scale-110">
              <Star className={cn("size-7", n <= chosen ? "fill-warning text-warning" : "text-muted-foreground")} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
      {!customer && (
        <>
          <div className="grid gap-2">
            <Label htmlFor="review-name">Your Name *</Label>
            <Input id="review-name" name="name" required minLength={2} maxLength={100} defaultValue={v.name} autoComplete="name" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="review-email">Email * <span className="font-normal text-muted-foreground">(not shown publicly)</span></Label>
            <Input id="review-email" name="email" type="email" required maxLength={150} defaultValue={v.email} autoComplete="email" />
          </div>
        </>
      )}
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="review-title">Title</Label>
        <Input id="review-title" name="title" maxLength={200} defaultValue={v.title} />
      </div>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="review-text">Your Review *</Label>
        <Textarea id="review-text" name="text" rows={4} required minLength={minLength} maxLength={3000} defaultValue={v.text} placeholder={`Share your thoughts (minimum ${minLength} characters)...`} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending} className="h-11 w-full rounded-full px-6 sm:w-auto">
          {pending ? <DotsLoader size="sm" label="Sending" /> : "Submit Review"}
        </Button>
      </div>
    </form>
  );
}

function HelpfulButton({ id, count }: { id: number; count: number }) {
  const [value, setValue] = useState(count);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={done || pending}
      onClick={() =>
        start(async () => {
          const next = await markHelpful(id);
          if (next !== null) setValue(next);
          setDone(true);
        })
      }
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
    >
      <ThumbsUp className="size-3.5" aria-hidden="true" /> Helpful ({value})
    </button>
  );
}

export default function ReviewSection({ productId, reviews, enabled, minLength }: { productId: number; reviews: ReviewItem[]; enabled: boolean; minLength: number }) {
  const [writing, setWriting] = useState(false);
  const average = reviews.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Customer Reviews</h2>
          {reviews.length > 0 ? (
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><Stars value={average} /> {average.toFixed(1)} out of 5 ({reviews.length})</p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">No reviews yet. Be the first to share your thoughts.</p>
          )}
        </div>
        {enabled && !writing && <Button variant="outline" className="rounded-full" onClick={() => setWriting(true)}><MessageSquarePlus aria-hidden="true" /> Write a Review</Button>}
      </div>
      {writing && <div className="mt-6"><ReviewForm productId={productId} minLength={minLength} /></div>}
      {reviews.length > 0 && (
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-2xl border bg-card p-5">
              <div className="flex items-center justify-between gap-2">
                <Stars value={r.rating} className="size-3.5" />
                <time className="text-xs text-muted-foreground">{r.date}</time>
              </div>
              {r.title && <h3 className="mt-3 font-medium">{r.title}</h3>}
              <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">{r.review_text}</p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-sm font-medium">{r.customer_name} {r.verified && <span className="inline-flex items-center gap-1 text-xs font-normal text-success"><BadgeCheck className="size-3.5" aria-hidden="true" /> Verified Purchase</span>}</p>
                <HelpfulButton id={r.id} count={r.helpful} />
              </div>
              {r.reply && <p className="mt-3 rounded-xl bg-muted/50 p-3 text-sm"><strong className="font-medium">Reply from the store:</strong> {r.reply}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
