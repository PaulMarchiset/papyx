import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "@/locales/fr.json";
import en from "@/locales/en.json";

export type Language = "system" | "fr" | "en";

/** "system" follows the OS/browser locale, with French as the fallback. */
export function resolveLanguage(language: Language): "fr" | "en" {
  if (language !== "system") return language;
  const tag = typeof navigator !== "undefined" ? navigator.language : "fr";
  return tag.toLowerCase().startsWith("en") ? "en" : "fr";
}

i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr }, en: { translation: en } },
  lng: resolveLanguage("system"),
  fallbackLng: "fr",
  interpolation: { escapeValue: false },
});

export default i18n;
