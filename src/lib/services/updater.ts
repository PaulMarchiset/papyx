import { isTauri } from "@/lib/platform";

/**
 * The app's only conversation with the network.
 *
 * It fetches one file — the signed release manifest on GitHub — compares the
 * version in it with the running one, and can download and run the installer.
 * Nothing is sent: no document, no filename, no identifier, no telemetry. The
 * request is a plain GET, and the reply is checked against the public key baked
 * into `tauri.conf.json`, so an installer that was not signed with Papyx's key
 * is refused before it is ever run.
 *
 * All of it lives behind `isTauri` and dynamic imports: in the browser fallback
 * (`npm run dev`, and the Playwright suite) there is nothing to update, so the
 * plugin is never even loaded and `checkForUpdate` simply reports "nothing".
 */

export interface AvailableUpdate {
  version: string;
  /** Release notes from the manifest, when the release had a body. */
  notes: string | null;
  /** Downloads the installer and runs it. Resolves once it is staged. */
  install: (onProgress: (fraction: number | null) => void) => Promise<void>;
}

/**
 * Resolves to the update if one is waiting, or null if the app is current.
 * Throws when the check itself failed (offline, GitHub down, bad signature) —
 * callers decide how loud that should be, and on a background check it is
 * always silent.
 */
export async function checkForUpdate(): Promise<AvailableUpdate | null> {
  if (!isTauri) return null;

  const { check } = await import("@tauri-apps/plugin-updater");
  const update = await check();
  if (!update) return null;

  return {
    version: update.version,
    notes: update.body?.trim() ? update.body.trim() : null,
    install: async (onProgress) => {
      // The plugin reports bytes, and only reports a total when the server sent
      // a content-length — hence the null, which the bar reads as "sweep".
      let total = 0;
      let downloaded = 0;
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            total = event.data.contentLength ?? 0;
            onProgress(total > 0 ? 0 : null);
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            onProgress(total > 0 ? Math.min(downloaded / total, 1) : null);
            break;
          case "Finished":
            onProgress(1);
            break;
        }
      });
    },
  };
}

/**
 * Quits and comes back up on the new version. Only meaningful once `install`
 * has resolved; on Windows the NSIS installer has already replaced the files by
 * then, so this is the step that makes the running process notice.
 */
export async function relaunchApp(): Promise<void> {
  if (!isTauri) return;
  const { relaunch } = await import("@tauri-apps/plugin-process");
  await relaunch();
}
