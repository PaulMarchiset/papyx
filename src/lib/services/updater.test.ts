import { describe, expect, it } from "vitest";
import { checkForUpdate, relaunchApp } from "./updater";

/**
 * Outside the Tauri shell there is no installer to run, and the updater plugin
 * is not there to be imported. Both entry points have to be inert rather than
 * throwing: the same bundle is what `npm run dev` and the Playwright suite
 * load, and a rejected promise on startup would surface as an error nobody can
 * act on.
 *
 * This runs under Vitest's node environment, where there is no `window` at all
 * — the same branch a plain browser takes, reached from the other side.
 */
describe("updater outside Tauri", () => {
  it("reports no update rather than reaching for the plugin", async () => {
    await expect(checkForUpdate()).resolves.toBeNull();
  });

  it("has nothing to relaunch", async () => {
    await expect(relaunchApp()).resolves.toBeUndefined();
  });
});
