/**
 * The shapes the interface is cut from.
 *
 * Papyx is drawn with two families and nothing in between. A **card** is a
 * squircle of surface with a soft shadow under it — the panels, the file tray,
 * the result, the dialogs; an **inset** is the same corner, one step darker,
 * for a block that lives *inside* a card. Everything you press is a **pill**:
 * the accent one is the action, the outlined one is everything else, and the
 * round one is an icon on its own.
 *
 * They live here rather than in each component for the reason PILL_BASE does
 * (see ./pill.ts): a radius or a padding that drifts by two pixels between two
 * buttons is invisible in a diff and obvious on screen. The squircle itself is
 * not in these strings — `corner-shape` is applied to every radius in
 * styles.css, so a card is square-cornered nowhere and superelliptical
 * everywhere the engine can draw it.
 */

/** A surface that floats: panels, the tray, the result, a dialog. */
export const CARD = "rounded-3xl bg-surface shadow-card";

/** A block inside a card — a notice, a list of outputs, a preview. */
export const INSET = "rounded-2xl bg-elevate-1";

/** The accent square behind a tool's icon. Size is the caller's business. */
export const TILE = "inline-flex items-center justify-center rounded-2xl";

const BTN = "flex-shrink-0 inline-flex items-center justify-center gap-2 transition-colors";

/** The action: one per panel, in accent. */
export const BTN_PRIMARY =
  `${BTN} rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white ` +
  "hover:bg-accent/85 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-accent";

/** Everything else with a label: outlined, same height as the primary. */
export const BTN_SECONDARY =
  `${BTN} rounded-full border border-border-strong px-4 py-2 text-sm text-fg ` +
  "hover:bg-elevate-2 hover:border-border-hover " +
  "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent";

/** The small outlined pill: shortcuts, chained tools, a row's own control. */
export const BTN_QUIET =
  `${BTN} rounded-full border border-border px-3 py-1.5 text-xs text-subtle ` +
  "hover:text-fg hover:border-border-hover";

/** An icon with no label — closing a panel, removing a row. */
export const BTN_ICON =
  `${BTN} rounded-full p-2 text-muted hover:text-fg hover:bg-elevate-3`;
