// Rows of seo_redirects, edited in Admin → SEO → Redirects. No database or server-only imports, so proxy.ts can use it.
//   "/old-page"      matches exactly that path (trailing slash and query string ignored)
//   "/old-section/*" matches everything under it; a "*" in the destination receives the rest
export type RedirectRule = { id: number; old_url: string; new_url: string; redirect_type: string | null };

/** "https://slicedot.in/About/?x=1" → "/About". Case is kept: URLs are case-sensitive. "" for anything that isn't a path. */
export function normalizePath(input: string) {
  let path = input.trim();
  try {
    if (/^https?:\/\//i.test(path)) path = new URL(path).pathname;
  } catch {
    return "";
  }
  path = path.split(/[?#]/)[0];
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1) path = path.replace(/\/+$/, "");
  return /^\/\S*$/.test(path) ? path : "";
}

const statusOf = (rule: RedirectRule) => (rule.redirect_type === "410" ? 410 : rule.redirect_type === "302" ? 302 : 301);

export function matchRedirect(rules: RedirectRule[], pathname: string) {
  const path = normalizePath(pathname);
  const exact = rules.find((r) => !r.old_url.endsWith("/*") && normalizePath(r.old_url) === path && (statusOf(r) === 410 || (r.new_url && normalizePath(r.new_url) !== path)));
  if (exact) return { rule: exact, location: exact.new_url, status: statusOf(exact) };
  // Wildcards: longest prefix wins.
  let best: { rule: RedirectRule; location: string; status: number } | null = null;
  for (const rule of rules) {
    if (!rule.old_url.endsWith("/*")) continue;
    const prefix = rule.old_url.slice(0, -1); // keep the trailing "/"
    if (path.startsWith(prefix) && (!best || prefix.length > best.rule.old_url.length - 1)) {
      const location = rule.new_url.includes("*") ? rule.new_url.replace("*", path.slice(prefix.length)) : rule.new_url;
      if (statusOf(rule) === 410 || location !== path) best = { rule, location, status: statusOf(rule) };
    }
  }
  return best;
}
