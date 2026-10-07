import { cn } from "@/lib/cn";
import { CARD } from "@/components/ui/styles";

interface Props {
  title?: string;
  children: React.ReactNode;
}

/**
 * A titled card. The title sits outside the surface, in sentence case at
 * reading size — the website's rule that a label you have to squint at is not
 * structure, it is a footnote.
 */
export function Section({ title, children }: Props) {
  return (
    <div>
      {title && (
        <h3 className="text-sm font-semibold text-fg mb-3 px-1">
          {title}
        </h3>
      )}
      {/* data-card is the handle the motion test reaches for: it needs the
          card itself, and a radius class is not a name. */}
      <div data-card className={cn(CARD, "px-6 py-6 space-y-5")}>{children}</div>
    </div>
  );
}
