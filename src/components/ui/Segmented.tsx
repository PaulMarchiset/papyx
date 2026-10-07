import { cn } from "@/lib/cn";

export interface Segment<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface Props<T extends string> {
  value: T;
  segments: Segment<T>[];
  onChange: (value: T) => void;
}

/**
 * Three or four mutually exclusive choices, side by side on a recessed track —
 * FFkit's theme switch, generalised. Used where the options are few, short and
 * worth seeing all at once; anything longer belongs in a {@link Select}.
 */
export function Segmented<T extends string>({ value, segments, onChange }: Props<T>) {
  return (
    <div role="radiogroup" className="inline-flex flex-wrap gap-1 p-1 rounded-xl bg-elevate-2">
      {segments.map((segment) => (
        <button
          key={segment.value}
          type="button"
          role="radio"
          aria-checked={value === segment.value}
          onClick={() => onChange(segment.value)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
            value === segment.value
              ? "bg-surface text-fg shadow-card"
              : "text-muted hover:text-fg",
          )}
        >
          {segment.icon}
          {segment.label}
        </button>
      ))}
    </div>
  );
}
