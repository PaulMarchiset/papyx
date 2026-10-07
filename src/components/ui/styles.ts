/**
 * The shapes the interface is cut from.
 *
 * Papyx is drawn with two families and nothing in between, the same two the
 * website uses. A **card** is a squircle of surface with a soft shadow under
 * it — the panels, the result, the dialogs; an **inset** is the same corner,
 * one step darker, for a block that lives *inside* a card. Everything you press
 * is a squircle too: the accent one is the action, the filled one is
 * everything else, and the bare one is an icon on its own.
 *
 * No borders. Not thin ones — none, on anything you press or anything that
 * floats. Elevation and fill do that work, which is what makes the app read as
 * the same object as the site. The one outline left is selection (a ring on a
 * picked page), because "this one" needs a mark that is not a shade.
 *
 * They live here rather than in each component because a radius or a padding
 * that drifts by two pixels between two buttons is invisible in a diff and
 * obvious on screen. The squircle itself is not in these strings —
 * `corner-shape` is applied to every radius in styles.css.
 */

/** A surface that floats: the two workspace panels, a dialog. */
export const CARD = "rounded-3xl bg-surface shadow-card";

/** A block inside a card — a notice, a list of outputs, a preview. */
export const INSET = "rounded-2xl bg-elevate-1";

/** The square behind an icon. Size and colour are the caller's business. */
export const TILE = "inline-flex items-center justify-center rounded-xl";

const BTN =
  "flex-shrink-0 inline-flex items-center justify-center gap-2 transition-colors " +
  "disabled:cursor-not-allowed";

/** The action: one per panel, in accent. */
export const BTN_PRIMARY =
  `${BTN} rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white ` +
  "hover:bg-accent-hover disabled:opacity-40 disabled:hover:bg-accent";

/** Everything else with a label: filled, same height as the primary. */
export const BTN_SECONDARY =
  `${BTN} rounded-xl bg-elevate-2 px-4 py-2.5 text-sm text-fg ` +
  "hover:bg-elevate-4 disabled:opacity-30 disabled:hover:bg-elevate-2";

/** The small one: shortcuts, chained tools, a row's own control. */
export const BTN_QUIET =
  `${BTN} rounded-lg bg-elevate-2 px-3 py-1.5 text-xs text-subtle ` +
  "hover:text-fg hover:bg-elevate-4 disabled:opacity-30";

/** An icon with no label — closing a panel, removing a row. */
export const BTN_ICON =
  `${BTN} rounded-lg p-2 text-muted hover:text-fg hover:bg-elevate-3 disabled:opacity-30`;
