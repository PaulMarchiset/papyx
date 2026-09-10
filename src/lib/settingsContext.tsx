import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import i18n, { resolveLanguage } from "@/lib/i18n";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/types";

const STORAGE_KEY = "papyx.settings";

interface SettingsContextValue {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

/**
 * Settings live in localStorage rather than behind an IPC call: they are three
 * scalars, the webview owns them, and keeping them client-side means the
 * browser fallback (`npm run dev`) behaves exactly like the packaged app.
 */
function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Which of the two palettes a theme setting resolves to, right now. */
function isDark(theme: Settings["theme"]): boolean {
  return (
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  );
}

/**
 * Paints the stored theme onto <html> before React's first render.
 *
 * index.html ships `.dark`, so without this a light user gets the whole
 * interface cross-fading from dark to light on the first frame — every colour
 * transition in the app firing at once, which is exactly the arriving-interface
 * effect the rest of the app goes out of its way not to have. Called from
 * main.tsx rather than written inline in index.html, which would mean carving a
 * hash or 'unsafe-inline' out of the production CSP for it.
 */
export function applyStoredAppearance(): void {
  const dark = isDark(load().theme);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.classList.toggle("light", !dark);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* private mode / quota — the session still works, it just won't stick */
      }
      return next;
    });
  }, []);

  // Tracks the last resolved appearance so only a genuine light<->dark flip is
  // animated — not the initial hydration (index.html already ships `.dark`).
  const previousDark = useRef<boolean | null>(null);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = isDark(settings.theme);
      if (previousDark.current !== null && previousDark.current !== dark) {
        root.classList.add("theme-transition");
        if (transitionTimer.current) clearTimeout(transitionTimer.current);
        transitionTimer.current = setTimeout(
          () => root.classList.remove("theme-transition"),
          250,
        );
      }
      previousDark.current = dark;
      root.classList.toggle("dark", dark);
      root.classList.toggle("light", !dark);
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [settings.theme]);

  useEffect(() => {
    const language = resolveLanguage(settings.language);
    if (i18n.language !== language) i18n.changeLanguage(language);
    document.documentElement.lang = language;
  }, [settings.language]);

  return (
    <SettingsContext.Provider value={{ settings, update }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error("useSettings must be used inside SettingsProvider");
  return value;
}
