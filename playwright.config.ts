import { defineConfig, devices } from "@playwright/test";

/**
 * The suite drives the app in a plain browser, where every native call falls
 * back to the web equivalent (see services/fileSystem.ts). That covers the
 * whole PDF pipeline — pdf-lib, the pdf.js worker and the CMap assets all run
 * exactly as they do inside the Tauri webview.
 */
export default defineConfig({
  testDir: "./tests",
  globalSetup: "./tests/globalSetup.ts",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:1420",
    ...devices["Desktop Chrome"],
    // The app follows the browser locale; the specs are written against French.
    locale: "fr-FR",
    viewport: { width: 1100, height: 820 },
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:1420",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
