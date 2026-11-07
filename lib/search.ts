// Store search terms: a phrase is split into words, filler words are dropped, and every remaining word has to match somewhere.
// "claw clip for women india" finds the "Pearl Wing Tassel Hair Claw Clip for Women", which a whole-phrase match never did.

const FILLER = new Set([
  "a", "an", "and", "the", "for", "with", "of", "in", "on", "to", "from", "by", "under", "below", "best", "buy", "online", "india", "indian",
  "cheap", "price", "prices", "shop", "store", "sale", "new", "latest", "top", "quality", "premium", "original", "item", "items", "product", "products",
]);

/** Search words, lower-cased, without filler words. Plural "s" is dropped so "clips" also finds "clip". */
export function searchTokens(query: string): string[] {
  const words = query.toLowerCase().normalize("NFKD").replace(/[^a-z0-9₹\s-]/g, " ").split(/[\s-]+/).filter(Boolean);
  const kept = words.filter((w) => !FILLER.has(w) && w.length > 1);
  const tokens = (kept.length ? kept : words).map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w));
  return [...new Set(tokens)].slice(0, 6);
}

/** Edit distance, capped: anything past `max` returns max + 1. */
function distance(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, cur[j]);
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** The closest catalog spelling of each word, or null when nothing changes. "parfume brsh" → "parfum brush". */
export function correctQuery(tokens: string[], vocabulary: Iterable<string>): string | null {
  const words = [...new Set(vocabulary)].filter((w) => w.length > 2);
  let changed = false;
  const fixed = tokens.map((token) => {
    if (token.length < 3 || words.includes(token)) return token;
    const max = token.length <= 4 ? 1 : 2;
    let best: string | null = null;
    let bestScore = max + 1;
    for (const word of words) {
      const score = distance(token, word, max);
      if (score < bestScore) [best, bestScore] = [word, score];
    }
    if (best) changed = true;
    return best ?? token;
  });
  return changed ? fixed.join(" ") : null;
}

/** Junk that must not count as a customer search, such as the schema.org search template bots request. */
export const isLoggableSearch = (query: string) => query.length >= 2 && query.length <= 80 && !/[{}<>\\]/.test(query);
