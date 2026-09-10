import { FolderOpen, Monitor, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { UpdateSection } from "@/components/UpdateSection";
import { Collapse } from "@/components/ui/Collapse";
import { Row } from "@/components/ui/Row";
import { Section } from "@/components/ui/Section";
import { BTN_SECONDARY } from "@/components/ui/styles";
import { Segmented } from "@/components/ui/Segmented";
import { Select } from "@/components/ui/Select";
import { pickDirectory } from "@/lib/services/fileSystem";
import { useSettings } from "@/lib/settingsContext";
import { isTauri } from "@/lib/platform";
import { APP_VERSION } from "@/lib/version";
import type { Language } from "@/lib/i18n";
import type { Theme } from "@/lib/types";

export function SettingsPanel() {
  const { t } = useTranslation();
  const { settings, update } = useSettings();

  return (
    <div className="space-y-6">
      {/* No back button: the settings toggle in the header is what opened this
          panel and is what closes it, so a second way out would only be a
          second thing to aim at. */}
      <h2 className="text-xl font-semibold text-fg">{t("settings.title")}</h2>

      <Section title={t("settings.appearance")}>
        <Row label={t("settings.theme")}>
          <Segmented<Theme>
            value={settings.theme}
            segments={[
              {
                value: "system",
                label: t("settings.themeSystem"),
                icon: <Monitor className="w-4 h-4" />,
              },
              {
                value: "light",
                label: t("settings.themeLight"),
                icon: <Sun className="w-4 h-4" />,
              },
              {
                value: "dark",
                label: t("settings.themeDark"),
                icon: <Moon className="w-4 h-4" />,
              },
            ]}
            onChange={(theme) => update({ theme })}
          />
        </Row>

        <Row label={t("settings.language")}>
          <Select<Language>
            value={settings.language}
            options={[
              { value: "system", label: t("settings.languageSystem") },
              { value: "fr", label: "Français" },
              { value: "en", label: "English" },
            ]}
            onChange={(language) => update({ language })}
          />
        </Row>
      </Section>

      {/* The browser fallback has no folder to point at — downloads go wherever
          the browser puts them — so this only appears under Tauri. */}
      {isTauri && (
        <Section title={t("settings.output")}>
          <Row label={t("settings.saveMode")}>
            <Select<"ask" | "fixed">
              value={settings.outputDir ? "fixed" : "ask"}
              options={[
                {
                  value: "ask",
                  label: t("settings.saveAsk"),
                  description: t("settings.saveAskHint"),
                },
                {
                  value: "fixed",
                  label: t("settings.saveFixed"),
                  description: t("settings.saveFixedHint"),
                },
              ]}
              onChange={async (mode) => {
                if (mode === "ask") {
                  update({ outputDir: null });
                  return;
                }
                // Choosing "fixed" needs a folder to be meaningful, so ask for
                // one right away; backing out leaves the setting where it was.
                const directory = await pickDirectory();
                if (directory) update({ outputDir: directory });
              }}
            />
          </Row>

          {/* Growing rather than appearing: picking a fixed folder adds a row
              in the middle of the card, and the rest of it should slide. */}
          <Collapse open={settings.outputDir != null}>
            <Row label={t("settings.folder")}>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted max-w-72 truncate" title={settings.outputDir ?? undefined}>
                  {settings.outputDir}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    const directory = await pickDirectory();
                    if (directory) update({ outputDir: directory });
                  }}
                  className={BTN_SECONDARY}
                >
                  <FolderOpen className="w-4 h-4" />
                  {t("settings.changeFolder")}
                </button>
              </div>
            </Row>
          </Collapse>
        </Section>
      )}

      {/* Nothing to update in a browser tab, so this follows the same rule as
          the output folder: native shell only. */}
      {isTauri && <UpdateSection />}

      <Section title={t("settings.about")}>
        <p className="text-sm text-muted leading-relaxed">{t("settings.aboutLocal")}</p>
        <p className="text-sm text-muted">{t("settings.version", { version: APP_VERSION })}</p>
      </Section>
    </div>
  );
}
