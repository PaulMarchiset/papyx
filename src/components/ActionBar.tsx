import { Download, FolderOpen, Loader2, Play, RotateCcw, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/ui/styles";
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
 * One action, always in the same place: the right edge of the panel. The button
 * carries the run through its whole life — start, cancel, save, open the folder
 * — instead of scattering those across the screen, and progress grows into the
 * space on its left rather than pushing the button around.
 */
export function ActionBar({ state, canRun, runLabel, onRun, onCancel, onSave, onReveal }: Props) {
  const { t } = useTranslation();
  const percent = state.progress == null ? null : Math.round(state.progress * 100);
  const running = state.status === "running";
  const done = state.status === "done";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          {running && (
            <div className="flex items-center gap-3">
              <div className="relative flex-1 h-1.5 rounded-full bg-elevate-3 overflow-hidden">
                {percent == null ? (
                  // No total yet: sweep rather than pretend to know a fraction.
                  <div className="absolute inset-y-0 w-1/3 rounded-full bg-accent animate-sweep" />
                ) : (
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-accent transition-[width] duration-150"
                    style={{ width: `${percent}%` }}
                  />
                )}
              </div>
              <span className="text-sm text-muted tabular-nums w-10 text-right">
                {percent == null ? "" : `${percent}%`}
              </span>
            </div>
          )}

        </div>

        {running && (
          <Secondary onClick={onCancel} icon={<X className="w-4 h-4" />}>
            {t("common.cancel")}
          </Secondary>
        )}

        {done && (
          <Secondary onClick={onRun} icon={<RotateCcw className="w-4 h-4" />}>
            {t("common.rerun")}
          </Secondary>
        )}

        {done && state.saved && state.savedTo ? (
          <Primary onClick={onReveal} icon={<FolderOpen className="w-4 h-4" />}>
            {t("common.reveal")}
          </Primary>
        ) : done && !state.saved ? (
          <Primary onClick={onSave} icon={<Download className="w-4 h-4" />}>
            {state.outputs.length > 1 ? t("common.saveAll") : t("common.save")}
          </Primary>
        ) : done ? null : (
          <Primary
            onClick={onRun}
            disabled={!canRun || running}
            icon={
              running ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )
            }
          >
            {running ? t("common.running") : (runLabel ?? t("common.run"))}
          </Primary>
        )}
      </div>

      {state.error && <p className="text-sm text-red-400 text-right">{state.error}</p>}
    </div>
  );
}

function Primary({
  children,
  icon,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={BTN_PRIMARY}
    >
      {icon}
      {children}
    </button>
  );
}

function Secondary({
  children,
  icon,
  onClick,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={BTN_SECONDARY}
    >
      {icon}
      {children}
    </button>
  );
}
