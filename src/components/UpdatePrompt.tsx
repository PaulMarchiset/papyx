import { Download, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/ui/styles";
import { useUpdater } from "@/lib/updaterContext";

/**
 * What a user actually sees of the updater: one dialog, shortly after launch,
 * when a newer version exists.
 *
 * It interrupts on purpose. An update that waits behind a button in Settings is
 * an update most people never learn about — the same reason nobody updates
 * their drivers — so the one moment where interrupting costs nothing, before
 * any document has been opened, is the moment to ask. "Later" is a real answer
 * and gets out of the way for the rest of the session.
 */
export function UpdatePrompt() {
  const { t } = useTranslation();
  const { stage, version, notes, progress, error, dismissed, install, dismiss } = useUpdater();

  const installing = stage === "installing";
  // An install that fails has to say so here rather than just closing: the
  // dialog is the only thing the user was looking at. A *check* that fails has
  // no version to report and never opened this, so it stays out of the way.
  const failed = stage === "error" && version != null;
  if (!version || dismissed || (stage !== "available" && !installing && !failed)) return null;

  const percent = progress == null ? null : Math.round(progress * 100);

  return (
    <Modal
      title={t("update.available", { version })}
      description={
        failed
          ? (error ?? t("update.failed"))
          : installing
            ? t("update.installingBody")
            : t("update.availableBody")
      }
      // Closing by backdrop or Escape means "not now", not "cancel the download"
      // — an install that is already running has no safe half-way out.
      onClose={installing ? () => {} : dismiss}
      body={
        failed ? undefined : installing ? (
          <div className="flex items-center gap-3">
            <div className="relative flex-1 h-1.5 rounded-full bg-elevate-3 overflow-hidden">
              {percent == null ? (
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
        ) : notes ? (
          // Whatever the release said, capped so a long changelog cannot push
          // the buttons off the bottom of the dialog.
          <p className="text-sm text-muted leading-relaxed max-h-32 overflow-y-auto whitespace-pre-line">
            {notes}
          </p>
        ) : undefined
      }
    >
      {failed ? (
        <button
          type="button"
          onClick={dismiss}
          className={BTN_SECONDARY}
        >
          {t("common.close")}
        </button>
      ) : installing ? (
        <span className="inline-flex items-center gap-2 text-sm text-muted">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t("update.installing")}
        </span>
      ) : (
        <>
          <button
            type="button"
            onClick={dismiss}
            className={BTN_SECONDARY}
          >
            {t("update.later")}
          </button>
          <button
            type="button"
            onClick={() => void install()}
            className={BTN_PRIMARY}
          >
            <Download className="w-4 h-4" />
            {t("update.install")}
          </button>
        </>
      )}
    </Modal>
  );
}
