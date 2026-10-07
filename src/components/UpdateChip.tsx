import { Download, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { useUpdater } from "@/lib/updaterContext";

/**
 * The update, as a row at the foot of the sidebar, just above Settings.
 *
 * It is there for as long as a newer version is waiting — from the moment the
 * check finds one, not only after the launch dialog has been waved away — so
 * an update is never something you have to remember was offered. Clicking it
 * brings the dialog back. While the installer downloads it shows how far it
 * has got, since the dialog is the only other place that does.
 */
export function UpdateChip({ onOpen }: { onOpen: (open: () => void) => void }) {
  const { t } = useTranslation();
  const { stage, version, progress, reopen } = useUpdater();

  // Also after a failed install: the update is still waiting, and this is the
  // only way back to the dialog once it has been closed.
  const installing = stage === "installing";
  const waiting = stage === "available" || installing || (stage === "error" && version != null);
  if (!waiting || !version) return null;

  const percent = progress == null ? null : Math.round(progress * 100);

  return (
    <button
      type="button"
      onClick={() => onOpen(reopen)}
      className={cn(
        "relative w-full overflow-hidden flex items-center gap-3 rounded-xl px-3 py-2.5 text-left",
        "bg-badge-bg text-badge-fg hover:brightness-[0.97] transition-[filter]",
      )}
    >
      {installing && percent != null && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 bg-accent/15 transition-[width] duration-150"
          style={{ width: `${percent}%` }}
        />
      )}
      <span className="relative flex-shrink-0">
        {installing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
      </span>
      <span className="relative min-w-0">
        <span className="block text-sm font-medium truncate">
          {installing ? t("update.installing") : t("update.chip")}
        </span>
        <span className="block text-xs opacity-75 tabular-nums truncate">
          {installing && percent != null
            ? `${percent}%`
            : t("update.chipVersion", { version })}
        </span>
      </span>
    </button>
  );
}
