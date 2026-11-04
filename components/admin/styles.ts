// Tailwind class strings shared by server and client admin components, on the Velora tokens.

export const inputCls =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20";
export const labelCls = "mb-1.5 block text-xs font-medium text-muted-foreground";
export const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90";
export const smallPrimaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90";
export const secondaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg border bg-background px-3.5 py-2 text-xs font-medium transition-colors hover:bg-muted";

/** Square icon buttons for table row actions (edit / toggle / delete / view). */
const iconBtn = "inline-flex size-8 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors";
export const iconBtnEdit = `${iconBtn} hover:border-border hover:bg-muted hover:text-foreground`;
export const iconBtnToggle = `${iconBtn} hover:border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-600`;
export const iconBtnDelete = `${iconBtn} hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive`;
export const iconBtnView = `${iconBtn} hover:border-border hover:bg-muted hover:text-foreground`;
