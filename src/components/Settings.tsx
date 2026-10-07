import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Download,
  FolderOpen,
  Info,
  Monitor,
  Moon,
  Palette,
  Sun,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { UpdateSection } from "@/components/UpdateSection";
import { PapyxMark } from "@/components/icons/PapyxLogo";
import { Collapse } from "@/components/ui/Collapse";
import { Row } from "@/components/ui/Row";
import { BTN_ICON, BTN_SECONDARY, CARD, TILE } from "@/components/ui/styles";
import { Segmented } from "@/components/ui/Segmented";
import { Select } from "@/components/ui/Select";
import { openExternal, pickDirectory } from "@/lib/services/fileSystem";
import { useSettings } from "@/lib/settingsContext";
import { isTauri } from "@/lib/platform";
import { APP_VERSION } from "@/lib/version";
import { cn } from "@/lib/cn";
import type { Language } from "@/lib/i18n";
import type { Theme } from "@/lib/types";

type SectionId = "appearance" | "output" | "updates" | "about";

interface Props {
  onClose: () => void;
  /** The unsaved-result guard: installing an update restarts the app. */
  guard: (action: () => void) => void;
}

/**
 * Settings, as a dialog over the workspace rather than a screen that replaces
 * it: they are a handful of switches you visit and leave, and the documents
 * and the open tool should still be there, visibly, behind them.
 *
 * Inside, one section at a time, picked from a list on the left — the shape of
 * the system settings people already know. Sections the browser fallback has
 * nothing to put in (the output folder, updates) are simply not listed there.
 */
export function SettingsDialog({ onClose, guard }: Props) {
  const { t } = useTranslation();
  const [section, setSection] = useState<SectionId>("appearance");

  const sections: { id: SectionId; icon: LucideIcon }[] = [
    { id: "appearance", icon: Palette },
    ...(isTauri
      ? [
          { id: "output" as const, icon: FolderOpen },
          { id: "updates" as const, icon: Download },
        ]
      : []),
    { id: "about", icon: Info },
  ];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("settings.title")}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-6"
      onClick={onClose}
    >
      <div
        className={cn(
          CARD,
          "shadow-pop w-full max-w-3xl h-[min(34rem,86vh)] flex overflow-hidden",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <nav className="w-52 flex-shrink-0 flex flex-col bg-elevate-1 p-3">
          <h2 className="px-3 pt-3 pb-5 text-lg font-semibold tracking-[-0.01em] text-fg">
            {t("settings.title")}
          </h2>
          <ul className="space-y-0.5">
            {sections.map(({ id, icon: Icon }) => {
              const active = id === section;
              return (
                <li key={id}>
                  <button
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => setSection(id)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                      active
                        ? "bg-surface text-fg shadow-card"
                        : "text-subtle hover:text-fg hover:bg-elevate-2",
                    )}
                  >
                    <Icon
                      className={cn("w-4 h-4 flex-shrink-0", active ? "text-accent" : "text-muted")}
                    />
                    {t(`settings.${id}`)}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-auto px-3 pb-1 text-xs text-muted tabular-nums">
            Papyx {APP_VERSION}
          </p>
        </nav>

        <div className="flex-1 min-w-0 flex flex-col">
          <header className="flex items-center justify-between gap-4 pl-8 pr-4 pt-5 pb-2">
            <h3 className="text-base font-semibold text-fg">{t(`settings.${section}`)}</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("common.close")}
              className={BTN_ICON}
            >
              <X className="w-4 h-4" />
            </button>
          </header>
          <div className="flex-1 min-h-0 overflow-y-auto px-8 pt-4 pb-8 space-y-7">
            {section === "appearance" && <Appearance />}
            {section === "output" && <Output />}
            {section === "updates" && <UpdateSection guard={guard} />}
            {section === "about" && <About />}
          </div>
        </div>
      </div>
    </div>
  );
}

function Appearance() {
  const { t } = useTranslation();
  const { settings, update } = useSettings();
  return (
    <>
      <Row label={t("settings.theme")}>
        <Segmented<Theme>
          value={settings.theme}
          segments={[
            { value: "system", label: t("settings.themeSystem"), icon: <Monitor className="w-4 h-4" /> },
            { value: "light", label: t("settings.themeLight"), icon: <Sun className="w-4 h-4" /> },
            { value: "dark", label: t("settings.themeDark"), icon: <Moon className="w-4 h-4" /> },
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
    </>
  );
}

function Output() {
  const { t } = useTranslation();
  const { settings, update } = useSettings();
  return (
    <>
      <Row label={t("settings.saveMode")}>
        <Select<"ask" | "fixed">
          value={settings.outputDir ? "fixed" : "ask"}
          options={[
            { value: "ask", label: t("settings.saveAsk"), description: t("settings.saveAskHint") },
            { value: "fixed", label: t("settings.saveFixed"), description: t("settings.saveFixedHint") },
          ]}
          onChange={async (mode) => {
            if (mode === "ask") {
              update({ outputDir: null });
              return;
            }
            // Choosing "fixed" needs a folder to be meaningful, so ask for one
            // right away; backing out leaves the setting where it was.
            const directory = await pickDirectory();
            if (directory) update({ outputDir: directory });
          }}
        />
      </Row>

      {/* Growing rather than appearing: picking a fixed folder adds a row, and
          what is under it should slide. */}
      <Collapse open={settings.outputDir != null}>
        <Row label={t("settings.folder")}>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted max-w-56 truncate" title={settings.outputDir ?? undefined}>
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
    </>
  );
}

function About() {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex items-center gap-4">
        <span className={cn(TILE, "w-14 h-14 rounded-2xl bg-paper shadow-card")}>
          <PapyxMark size={56} />
        </span>
        <div>
          <p className="text-lg font-semibold tracking-[-0.01em] text-fg">Papyx</p>
          <p className="text-sm text-muted">{t("settings.version", { version: APP_VERSION })}</p>
        </div>
      </div>
      <p className="max-w-prose text-sm text-subtle leading-relaxed">{t("settings.aboutLocal")}</p>
      <p className="text-sm text-muted">
        {t("settings.madeBy")}{" "}
        <a
          href="https://paulmarchiset.me"
          onClick={(event) => {
            event.preventDefault();
            void openExternal("https://paulmarchiset.me");
          }}
          className="inline-flex items-center gap-0.5 font-medium text-fg underline decoration-accent/40 underline-offset-4 hover:decoration-accent transition-colors"
        >
          Paul Marchiset
          <ArrowUpRight className="w-3.5 h-3.5 text-accent" />
        </a>
      </p>
    </>
  );
}
