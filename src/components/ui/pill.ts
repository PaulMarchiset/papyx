/**
 * Shared geometry for the small capsules ("3 pages", "Protégé", the header's
 * "100% local" chip).
 *
 * The padding is deliberately asymmetric: the text sits on a `leading-none`
 * line box, where the baseline leaves roughly twice as much slack under the
 * glyphs as above them. Even padding therefore reads bottom-heavy, and the
 * extra top padding is what makes a text-only capsule look optically centred.
 * Do not add an `h-*` class — it would re-centre the text and undo this.
 */
export const PILL_BASE =
  "flex-shrink-0 inline-flex items-center px-2.5 pt-[7px] pb-[3px] rounded-full text-xs leading-none";

/**
 * The variant for capsules that carry an icon. An icon is a *box*, not a run of
 * text, so it centres on the line box rather than the baseline — under
 * PILL_BASE's asymmetric padding it ends up sitting visibly lower than the
 * label next to it. This variant pads evenly and centres both children, which
 * lines them up, and is roomier so the pair doesn't feel shrink-wrapped.
 */
export const PILL_ICON =
  "flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs leading-none";
