import { cn } from "@/lib/cn";

/**
 * Shared geometry for the small capsules ("3 pages", "Protégé", the header's
 * "100% local" chip, the update chip). Squircles, like everything else — the
 * name is older than the shape.
 *
 * The padding is symmetric and the label is not nudged, which is only true
 * because the interface font's metrics were corrected at the source — see the
 * `ascent-override` note above the "PP Mori" faces in styles.css. Before that,
 * every capsule needed extra padding on top to look centred, and its icon then
 * failed to line up with its own label. If a capsule ever looks off again, the
 * answer is in that note and not in this file.
 */
export const PILL =
  "flex-shrink-0 inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs leading-none";

interface Props {
  /** Drawn before the label, on the same centre line. */
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  /** When given the capsule is a real button; otherwise it is a plain label. */
  onClick?: () => void;
  title?: string;
  "aria-label"?: string;
}

/** A capsule, so that no two of them drift apart. */
export function Pill({ icon, className, children, onClick, title, ...rest }: Props) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        className={cn(PILL, className)}
        {...rest}
      >
        {icon}
        {children}
      </button>
    );
  }

  return (
    <span title={title} className={cn(PILL, className)} {...rest}>
      {icon}
      {children}
    </span>
  );
}
