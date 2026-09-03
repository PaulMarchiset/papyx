import { cn } from "@/lib/cn";

const INPUT_BASE =
  "rounded-md border border-border-strong bg-elevate-1 px-3 py-2 text-sm text-fg " +
  "outline-none placeholder:text-muted focus:border-accent transition-colors";

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
        invalid && "border-red-500/60 focus:border-red-500",
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

export function Slider({ value, onChange, min, max, step = 1, format }: SliderProps) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-40 accent-accent"
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
        className="w-9 h-9 rounded-md border border-border-strong bg-transparent cursor-pointer p-1"
      />
      <TextField value={value} onChange={onChange} mono className="w-28" />
    </div>
  );
}
