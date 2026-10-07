import { Download, Loader2, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Row } from "@/components/ui/Row";
import { Toggle } from "@/components/ui/Toggle";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/ui/styles";
import { useSettings } from "@/lib/settingsContext";
import { useUpdater } from "@/lib/updaterContext";
import { APP_VERSION } from "@/lib/version";

/**
 * The Settings half of the updater: the switch that governs the launch check,
 * and a way to ask right now.
 *
 * The manual button is the smaller half on purpose — it is here for the person
 * who turned the automatic check off, not as the way updates normally arrive.
 *
 * Installing restarts the app, so it goes through `guard`, the same
 * unsaved-result prompt as every other way out of a finished run.
 */
export function UpdateSection({ guard }: { guard: (action: () => void) => void }) {
  const { t } = useTranslation();
  const { settings, update } = useSettings();
  const { stage, version, error, check, install } = useUpdater();

  const busy = stage === "checking" || stage === "installing";
  const status =
    stage === "checking"
      ? t("update.checking")
      : stage === "current"
        ? t("update.current")
        : stage === "available" || stage === "installing"
          ? t("update.available", { version })
          : stage === "error"
            ? (error ?? t("update.failed"))
            : undefined;

  return (
    <>
      <Row label={t("settings.autoUpdate")} description={t("settings.autoUpdateHint")}>
        <Toggle
          checked={settings.autoUpdate}
          onChange={(autoUpdate) => update({ autoUpdate })}
          label={t("settings.autoUpdate")}
        />
      </Row>

      <Row label={t("settings.version", { version: APP_VERSION })} description={status}>
        {stage === "available" ? (
          <button
            type="button"
            onClick={() => guard(() => void install())}
            className={BTN_PRIMARY}
          >
            <Download className="w-4 h-4" />
            {t("update.install")}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void check()}
            disabled={busy}
            className={BTN_SECONDARY}
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {t("update.checkNow")}
          </button>
        )}
      </Row>
    </>
  );
}
