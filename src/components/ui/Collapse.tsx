import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

interface Props {
  open: boolean;
  children: React.ReactNode;
}

/**
 * An option that grows into the layout and shrinks back out of it.
 *
 * Conditional rows are the one place the app used to jump: picking a preset
 * that swaps PNG for JPEG inserted the quality row, and everything under it —
 * the rest of the card, the run bar, the result — moved forty pixels in a
 * single frame. Here the row itself carries the height, so its neighbours
 * simply travel with it.
 *
 * `grid-template-rows: 0fr -> 1fr` is what makes that animatable at all: the
 * row is sized by its content and the fraction interpolates, which `height:
 * auto` cannot do. Duration and easing are the theme defaults, so this moves
 * with everything else.
 */
export function Collapse({ open, children }: Props) {
  // Children are frozen as they were for the length of the close, so a row
  // does not blank out halfway through it — the folder path in Settings reads
  // the very setting being switched off.
  const last = useRef(children);
  if (open) last.current = children;

  const box = useRef<HTMLDivElement>(null);
  // Three flags, because a row cannot be in two of these states at once: it is
  // out of the tree entirely when closed (a zero-height box would still hand
  // its neighbour the gap of a row that is not there — `space-y` margins go by
  // position in the DOM, not by size), it is in the tree but still collapsed
  // for the instant it takes to give the transition something to start from,
  // and it is clipped while moving but not once open, or a Select's menu
  // inside it would be cut off.
  const [present, setPresent] = useState(open);
  const [expanded, setExpanded] = useState(open);
  const [clip, setClip] = useState(!open);

  useLayoutEffect(() => {
    if (open) {
      setPresent(true);
      return;
    }
    setClip(true);
    setExpanded(false);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !present || expanded) return;
    const element = box.current;
    if (!element) return;
    // Reading the layout settles the collapsed state as the one the browser
    // transitions *from*; without it both states land in the same recalc and
    // the row simply appears at full height.
    void element.offsetHeight;
    setExpanded(true);
  }, [open, present, expanded]);

  if (!present) return null;

  return (
    <div
      ref={box}
      data-collapse
      className={cn(
        "grid transition-[grid-template-rows,opacity,margin]",
        // `mb-0!` while closed: the parent's `space-y` gap belongs to a row
        // that currently has no height, and would leave a hole behind it.
        expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 mb-0!",
      )}
      onTransitionEnd={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.propertyName !== "grid-template-rows") return;
        if (open) setClip(false);
        else setPresent(false);
      }}
    >
      <div className={clip ? "overflow-hidden" : undefined}>{last.current}</div>
    </div>
  );
}
