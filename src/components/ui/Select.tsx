import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { PILL_BASE } from "@/components/ui/pill";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  /** Neutral capsule after the label — a short technical tag, uppercased. */
  tag?: string;
  /** One-line explanation under the label. Any option with one switches the
   *  whole menu to the roomier two-line layout. */
  description?: string;
}

interface Props<T extends string> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * The dropdown, drawn rather than delegated to the platform: a native <select>
 * popup ignores the app's tokens entirely, and these menus need to carry
 * descriptions and capsules. Same construction as FFkit's — a button, a
 * listbox, dismissal on outside click or Escape.
 */
export function Select<T extends string>({
  value,
  options,
  onChange,
  className,
  disabled,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((option) => option.value === value);
  const roomy = options.some((option) => option.description);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex w-full items-center justify-between gap-2 min-w-36 pl-4 pr-3 py-2 text-sm",
          "rounded-full border border-border-soft text-fg outline-none transition-colors",
          "hover:bg-elevate-2 focus:border-accent/50 cursor-pointer",
          disabled && "opacity-40 cursor-not-allowed hover:bg-transparent",
        )}
      >
        {/* Label and capsule share a baseline-aligned box; the chevron stays
            centred on the button. */}
        <span className="flex items-baseline gap-2 min-w-0">
          <span className="truncate">{selected?.label ?? ""}</span>
          {selected?.tag && <Tag>{selected.tag}</Tag>}
        </span>
        <ChevronDown
          className={cn("w-4 h-4 text-muted transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className={cn(
            "absolute right-0 z-30 mt-1.5 min-w-full rounded-2xl bg-surface shadow-pop",
            // Roomy menus share a floor width so the dropdowns read as one
            // family instead of each hugging its longest option.
            roomy ? "min-w-88 p-1.5" : "p-1",
          )}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full flex-col items-start rounded-xl px-3 text-left transition-colors",
                  roomy ? "gap-1 py-2.5" : "py-1.5 whitespace-nowrap",
                  // Selection is carried by the filled card alone — no tick,
                  // no border.
                  isSelected
                    ? "bg-elevate-3 text-fg"
                    : "text-subtle hover:bg-elevate-1 hover:text-fg",
                )}
              >
                {/* items-baseline, not items-center: the capsules carry more
                    padding above their text than below (see PILL_BASE), so
                    centring the boxes would leave their text sitting low. */}
                <span className="flex items-baseline gap-2">
                  <span className={roomy ? "text-base" : "text-sm"}>{option.label}</span>
                  {option.tag && <Tag>{option.tag}</Tag>}
                </span>
                {option.description && (
                  <span className="text-sm text-muted whitespace-normal">
                    {option.description}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className={cn(PILL_BASE, "uppercase tracking-[0.06em] text-muted bg-elevate-3")}>
      {children}
    </span>
  );
}
