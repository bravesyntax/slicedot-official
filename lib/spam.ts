import "server-only";

/** Drops the "withdraw your BTC" scam, common spam phrases, and messages with 2+ links. */
export function looksLikeSpam(name: string, message: string): boolean {
  const text = `${name} ${message}`.toLowerCase();
  if (text.includes("withdraw") && ["btc", "bitcoin", "crypto", "usdt"].some((w) => text.includes(w))) return true;
  if (["viagra", "cialis", "casino", "guaranteed #1", "buy backlinks", "seo backlinks"].some((p) => text.includes(p))) return true;
  return (message.match(/https?:\/\//gi) ?? []).length >= 2;
}
