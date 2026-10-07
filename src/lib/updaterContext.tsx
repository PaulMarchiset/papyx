import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  checkForUpdate,
  fakeUpdateRequested,
  relaunchApp,
  type AvailableUpdate,
} from "@/lib/services/updater";
import { useSettings } from "@/lib/settingsContext";
import { isTauri } from "@/lib/platform";

/**
 * Where the app stands relative to the latest release.
 *
 * `current` and `error` exist only to answer a check the user asked for: a
 * background check that finds nothing, or fails because the machine is offline,
 * must leave no trace on screen. Being offline is not a problem to report — the
 * app works exactly as well without a network.
 */
export type UpdateStage =
  | "idle"
  | "checking"
  | "available"
  | "current"
  | "installing"
  | "error";

interface UpdaterContextValue {
  stage: UpdateStage;
  /** The waiting version, once `stage` is "available" or "installing". */
  version: string | null;
  notes: string | null;
  /** 0..1 while installing, or null when the download size is unknown. */
  progress: number | null;
  error: string | null;
  /** True once the launch prompt has been waved away for this session. */
  dismissed: boolean;
  check: () => Promise<void>;
  install: () => Promise<void>;
  dismiss: () => void;
  /** Brings a dismissed prompt back — what the sidebar's update button does. */
  reopen: () => void;
}

const UpdaterContext = createContext<UpdaterContextValue | null>(null);

export function UpdaterProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [stage, setStage] = useState<UpdateStage>("idle");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const update = useRef<AvailableUpdate | null>(null);
  const [found, setFound] = useState<{ version: string; notes: string | null } | null>(null);

  const run = useCallback(async (loud: boolean) => {
    setStage("checking");
    setError(null);
    try {
      const result = await checkForUpdate();
      update.current = result;
      if (result) {
        setFound({ version: result.version, notes: result.notes });
        setStage("available");
      } else {
        setFound(null);
        // A silent check that found nothing goes back to saying nothing at all;
        // only a check the user clicked earns "you're up to date".
        setStage(loud ? "current" : "idle");
      }
    } catch (cause) {
      update.current = null;
      if (loud) {
        setError(cause instanceof Error ? cause.message : String(cause));
        setStage("error");
      } else {
        setStage("idle");
      }
    }
  }, []);

  // A check the user asked for also undoes an earlier "Later": they went
  // looking, so the dialog is no longer in their way.
  const check = useCallback(() => {
    setDismissed(false);
    return run(true);
  }, [run]);

  const install = useCallback(async () => {
    const waiting = update.current;
    if (!waiting) return;
    // Installing from Settings should still show its progress in the dialog.
    setDismissed(false);
    setStage("installing");
    setProgress(null);
    setError(null);
    try {
      await waiting.install(setProgress);
      // On Windows the installer has already taken the process down by the time
      // this resolves; where it hasn't, this is what picks up the new binary.
      await relaunchApp();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStage("error");
    }
  }, []);

  const dismiss = useCallback(() => setDismissed(true), []);
  const reopen = useCallback(() => {
    setDismissed(false);
    // An install that failed left a stage nobody can act on. The update itself
    // is still waiting, so coming back to the dialog offers another go rather
    // than re-showing the error. Only then, though: the sidebar button is
    // clickable mid-install too, and must not knock a running install back to
    // "available".
    if (update.current) {
      setStage((current) => {
        if (current !== "error") return current;
        setError(null);
        return "available";
      });
    }
  }, []);

  // The one automatic check, on launch. Deferred a beat so it never competes
  // with the first paint, and skipped entirely outside Tauri — a browser tab
  // has no installer to run.
  const checked = useRef(false);
  useEffect(() => {
    if (!(isTauri || fakeUpdateRequested()) || !settings.autoUpdate || checked.current) return;
    // Marked when the check actually fires, not when it is scheduled: under
    // StrictMode the first run's timer is cleared straight away, and marking it
    // up front left the second run nothing to do — no launch check at all in
    // `tauri dev`.
    const timer = setTimeout(() => {
      checked.current = true;
      void run(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [settings.autoUpdate, run]);

  return (
    <UpdaterContext.Provider
      value={{
        stage,
        version: found?.version ?? null,
        notes: found?.notes ?? null,
        progress,
        error,
        dismissed,
        check,
        install,
        dismiss,
        reopen,
      }}
    >
      {children}
    </UpdaterContext.Provider>
  );
}

export function useUpdater(): UpdaterContextValue {
  const value = useContext(UpdaterContext);
  if (!value) throw new Error("useUpdater must be used inside UpdaterProvider");
  return value;
}
