import { ArrowLeft, FolderOpen, Monitor, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Row } from "@/components/ui/Row";
import { Section } from "@/components/ui/Section";
import { Segmented } from "@/components/ui/Segmented";
import { Select } from "@/components/ui/Select";
import { pickDirectory } from "@/lib/services/fileSystem";
import { useSettings } from "@/lib/settingsContext";
import { isTauri } from "@/lib/platform";
import { APP_VERSION } from "@/lib/version";
import type { Language } from "@/lib/i18n";
import type { Theme } from "@/lib/types";

interface Props {
  onBack: () => void;
}

export function SettingsPanel({ onBack }: Props) {
  const { t } = useTranslation();
  const { settings, update } = useSettings();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          aria-label={t("common.back")}
          className="p-2 rounded-md border border-border-strong text-fg hover:bg-elevate-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-xl font-semibold text-fg">{t("settings.title")}</h2>
      </div>

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

          {settings.outputDir && (
            <Row label={t("settings.folder")}>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted max-w-72 truncate" title={settings.outputDir}>
                  {settings.outputDir}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    const directory = await pickDirectory();
                    if (directory) update({ outputDir: directory });
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border-strong text-sm text-fg hover:bg-elevate-2 transition-colors"
                >
                  <FolderOpen className="w-4 h-4" />
                  {t("settings.changeFolder")}
                </button>
              </div>
            </Row>
          )}
        </Section>
      )}

      <Section title={t("settings.about")}>
        <p className="text-sm text-muted leading-relaxed">{t("settings.aboutLocal")}</p>
        <p className="text-sm text-muted">{t("settings.version", { version: APP_VERSION })}</p>
      </Section>
    </div>
  );
}
