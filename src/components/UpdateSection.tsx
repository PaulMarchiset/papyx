import { Download, Loader2, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Row } from "@/components/ui/Row";
import { Section } from "@/components/ui/Section";
import { Toggle } from "@/components/ui/Toggle";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/ui/styles";
import { useSettings } from "@/lib/settingsContext";
import { useUpdater } from "@/lib/updaterContext";

/**
 * The Settings half of the updater: the switch that governs the launch check,
 * and a way to ask right now.
 *
 * The manual button is the smaller half on purpose — it is here for the person
 * who turned the automatic check off, not as the way updates normally arrive.
 */
export function UpdateSection() {
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
    <Section title={t("settings.updates")}>
      <Row label={t("settings.autoUpdate")} description={t("settings.autoUpdateHint")}>
        <Toggle
          checked={settings.autoUpdate}
          onChange={(autoUpdate) => update({ autoUpdate })}
          label={t("settings.autoUpdate")}
        />
      </Row>

      <Row label={t("settings.updateNow")} description={status}>
        {stage === "available" ? (
          <button
            type="button"
            onClick={() => void install()}
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
    </Section>
  );
}
