import { useLayoutEffect, useRef } from "react";

/** The app's one easing (see --ease-soft in styles.css). */
export const EASE_SOFT = "cubic-bezier(0.33, 1, 0.68, 1)";

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Makes a list's rearrangements travel instead of jump: First, Last, Invert,
 * Play.
 *
 * Each direct child carrying `data-flip="<stable key>"` is measured after every
 * commit. One that has moved since the last commit is put back where it was
 * with a transform and released, so it glides to its new place — a file added
 * above it, a row removed, a drag-and-drop reorder, a page shifted in the
 * Organize grid. One that is new arrives from a few pixels above, fading in,
 * so a dropped file lands in the list rather than appearing in it.
 *
 * The animations are Web Animations on `transform` and `opacity` only, so they
 * never touch layout: what the user can click is already where it ends up.
 *
 * `enterOnMount: false` skips the arrival on the first render — a grid that
 * is simply *there* when its panel opens should not fade in tile by tile.
 *
 * Returns the ref for the list's container.
 */
export function useFlip<T extends HTMLElement>(
  dependency: unknown,
  { enterOnMount = true }: { enterOnMount?: boolean } = {},
) {
  const ref = useRef<T>(null);
  const mounted = useRef(false);
  // Positions relative to the container's own content box, so scrolling the
  // list (or the panel around it) between two changes is not mistaken for
  // every row having moved.
  const rects = useRef(new Map<string, { left: number; top: number }>());

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const elements = root.querySelectorAll<HTMLElement>(":scope > [data-flip]");
    // "First render" means the first one with anything in it: a grid usually
    // mounts empty and fills a tick later, once its data has loaded.
    const first = !mounted.current;
    if (elements.length > 0) mounted.current = true;
    const still = reducedMotion() || (first && !enterOnMount);
    const previous = rects.current;
    const next = new Map<string, { left: number; top: number }>();
    const origin = root.getBoundingClientRect();

    for (const element of elements) {
      // A move that interrupts another restarts from where the element is
      // laid out, not from where its last animation had carried it.
      for (const animation of element.getAnimations()) animation.cancel();
      const key = element.dataset.flip!;
      const box = element.getBoundingClientRect();
      const rect = {
        left: box.left - origin.left + root.scrollLeft,
        top: box.top - origin.top + root.scrollTop,
      };
      next.set(key, rect);
      if (still) continue;

      const before = previous.get(key);
      if (!before) {
        element.animate(
          [
            { opacity: 0, transform: "translateY(-6px)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: 300, easing: EASE_SOFT },
        );
        continue;
      }
      const dx = before.left - rect.left;
      const dy = before.top - rect.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
      element.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
        { duration: 360, easing: EASE_SOFT },
      );
    }
    rects.current = next;
  }, [dependency]);

  return ref;
}
