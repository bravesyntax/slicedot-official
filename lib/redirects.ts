// Matching for rows in seo_redirects. No database or server-only imports, so proxy.ts can use it.
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

export function matchRedirect(rules: RedirectRule[], pathname: string) {
  const path = normalizePath(pathname);
  const rule = rules.find((r) => r.new_url && normalizePath(r.old_url) === path && normalizePath(r.new_url) !== path);
  if (!rule) return null;
  return { rule, location: rule.new_url, status: rule.redirect_type === "302" ? 302 : 301 };
}
