import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";

export interface Preset {
  id: string;
  /** Translation key for the button label. */
  label: string;
  patch: Record<string, unknown>;
}

interface Props {
  presets: Preset[];
  options: Record<string, unknown>;
  onApply: (patch: Record<string, unknown>) => void;
}

/**
 * Named starting points for a tool's options. Most people want one of three or
 * four familiar outcomes and would rather not reason about DPI or opacity; the
 * individual controls stay below for everyone else, and touching one simply
 * leaves the preset no longer matching.
 */
export function PresetRow({ presets, options, onApply }: Props) {
  const { t } = useTranslation();

  const matches = (patch: Record<string, unknown>) =>
    Object.entries(patch).every(
      ([key, value]) => JSON.stringify(options[key]) === JSON.stringify(value),
    );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-fg mr-2">{t("options.presets")}</span>
      {presets.map((preset) => {
        const active = matches(preset.patch);
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onApply(preset.patch)}
            aria-pressed={active}
            className={cn(
              "px-3.5 py-1.5 rounded-full border text-sm transition-colors",
              active
                ? "border-accent/60 bg-accent/10 text-fg"
                : "border-border text-subtle hover:text-fg hover:border-border-hover",
            )}
          >
            {t(preset.label)}
          </button>
        );
      })}
    </div>
  );
}
