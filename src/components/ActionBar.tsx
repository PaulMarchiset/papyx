import { Download, FolderOpen, Loader2, Play, RotateCcw, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import type { JobState } from "@/lib/useJob";

interface Props {
  state: JobState;
  canRun: boolean;
  /** Overrides the "Lancer" label — the metadata tool applies, it doesn't run. */
  runLabel?: string;
  onRun: () => void;
  onCancel: () => void;
  onSave: () => void;
  onReveal: () => void;
}

/**
 * The foot of the tool panel, and the one place the eye goes for "what now".
 *
 * It used to be a button floating under the panel, alone at the right edge of
 * the page — easy to lose, and pushed below the fold by a long set of options.
 * Now the panel is a fixed-height card whose options scroll, and this bar is
 * its floor: always on screen, always under the settings it acts on.
 *
 * The main button spans the bar and carries the whole run: it starts it, fills
 * with progress while it runs, then becomes Save (or Open folder, once the
 * files are on disk). The secondary action beside it — Cancel while running,
 * Run again afterwards — is the only other thing that ever appears here, so
 * the bar never reflows into a different shape.
 */
export function ActionBar({ state, canRun, runLabel, onRun, onCancel, onSave, onReveal }: Props) {
  const { t } = useTranslation();
  const percent = state.progress == null ? null : Math.round(state.progress * 100);
  const running = state.status === "running";
  const done = state.status === "done";
  const revealable = done && state.saved && state.savedTo != null;
  const needsSave = done && !state.saved;

  const primary = running
    ? {
        label: t("common.running"),
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        onClick: () => {},
      }
    : revealable
      ? { label: t("common.reveal"), icon: <FolderOpen className="w-4 h-4" />, onClick: onReveal }
      : needsSave
        ? {
            label: state.outputs.length > 1 ? t("common.saveAll") : t("common.save"),
            icon: <Download className="w-4 h-4" />,
            onClick: onSave,
          }
        : done
          ? // Saved by the browser, which leaves nothing to open: running
            // again is the only thing left to offer.
            { label: t("common.rerun"), icon: <RotateCcw className="w-4 h-4" />, onClick: onRun }
          : {
              label: runLabel ?? t("common.run"),
              icon: <Play className="w-4 h-4" />,
              onClick: onRun,
            };

  return (
    <div className="space-y-2 px-6 pb-6 pt-3">
      {state.error && (
        <p role="alert" className="text-sm text-red-500">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-2">
        {running && (
          <button type="button" onClick={onCancel} className={cn(BTN_SECONDARY, "py-3")}>
            <X className="w-4 h-4" />
            {t("common.cancel")}
          </button>
        )}
        {done && (revealable || needsSave) && (
          <button type="button" onClick={onRun} className={cn(BTN_SECONDARY, "py-3")}>
            <RotateCcw className="w-4 h-4" />
            {t("common.rerun")}
          </button>
        )}

        <button
          type="button"
          onClick={primary.onClick}
          disabled={running || (!done && !canRun)}
          className={cn(
            BTN_PRIMARY,
            "relative flex-1 overflow-hidden py-3",
            // Busy is not disabled: the button keeps its colour while the
            // progress fills it.
            running && "disabled:opacity-100 disabled:cursor-progress",
          )}
        >
          {running && (
            <span aria-hidden="true" className="absolute inset-0">
              {percent == null ? (
                // No total yet: sweep rather than pretend to know a fraction.
                <span className="absolute inset-y-0 w-1/3 bg-white/20 animate-sweep" />
              ) : (
                <span
                  className="absolute inset-y-0 left-0 bg-white/20 transition-[width] duration-150"
                  style={{ width: `${percent}%` }}
                />
              )}
            </span>
          )}
          <span className="relative inline-flex items-center gap-2">
            {primary.icon}
            {primary.label}
            {running && percent != null && (
              <span className="tabular-nums opacity-80">{percent}%</span>
            )}
          </span>
        </button>
      </div>
    </div>
  );
}
