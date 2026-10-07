import { cn } from "@/lib/cn";

// Filled rather than outlined, like every other control: focus is a ring of
// accent, which is the one place an outline still earns its keep.
const INPUT_BASE =
  "rounded-xl bg-elevate-2 px-3.5 py-2 text-sm text-fg outline-none " +
  "placeholder:text-muted hover:bg-elevate-3 focus:bg-elevate-1 " +
  "focus:ring-2 focus:ring-accent/50 transition-colors";

interface TextFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  mono?: boolean;
  invalid?: boolean;
}

export function TextField({
  value,
  onChange,
  placeholder,
  className,
  mono,
  invalid,
}: TextFieldProps) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        INPUT_BASE,
        mono && "font-mono",
        invalid && "ring-2 ring-red-500/50 focus:ring-red-500/70",
        className,
      )}
    />
  );
}

interface NumberFieldProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export function NumberField({ value, onChange, min, max, step = 1, className }: NumberFieldProps) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const parsed = Number(e.target.value);
        if (!Number.isFinite(parsed)) return;
        // Clamping on change rather than on blur keeps the value a tool reads
        // always valid, so no run can start on an out-of-range number.
        const clamped = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, parsed));
        onChange(clamped);
      }}
      className={cn(INPUT_BASE, "w-24 text-right tabular-nums", className)}
    />
  );
}

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (value: number) => string;
}

/**
 * A range input drawn by the app (see `.slider` in styles.css) rather than
 * left to the platform: the native one is Chromium's blue-grey widget on
 * Windows and something else on every other engine. The filled part of the
 * track is a gradient stop fed through `--fill`, which is the only portable
 * way to colour "up to the thumb" — only Firefox has a pseudo-element for it.
 */
export function Slider({ value, onChange, min, max, step = 1, format }: SliderProps) {
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        style={{ "--fill": `${fill}%` } as React.CSSProperties}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider w-40"
      />
      <span className="text-sm text-muted tabular-nums w-12 text-right">
        {format ? format(value) : value}
      </span>
    </div>
  );
}

interface ColorFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function ColorField({ value, onChange }: ColorFieldProps) {
  return (
    <div className="inline-flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-9 h-9 rounded-lg bg-elevate-2 cursor-pointer p-1"
      />
      <TextField value={value} onChange={onChange} mono className="w-28" />
    </div>
  );
}
