/**
 * Rasterises app-icon.svg into the 1024x1024 PNG that `npx tauri icon` fans out
 * into every platform size.
 *
 * The renderer is Playwright's Chromium, already on hand for the e2e suite:
 * the artwork is real vector work with curves, and a hand-rolled rasteriser
 * would only ever approximate it. Nothing else in the repo depends on this —
 * run it when the artwork changes, commit the result.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const SIZE = 1024;
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "app-icon.svg"), "utf8");
const output = join(root, "app-icon.png");

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: SIZE, height: SIZE },
  deviceScaleFactor: 1,
});
// The SVG carries its own 1933x1933 box; stretching it to the viewport is what
// scales it down, and `display:block` keeps the page from adding a baseline gap.
await page.setContent(
  `<style>html,body{margin:0;padding:0}svg{display:block;width:${SIZE}px;height:${SIZE}px}</style>${svg}`,
);
// The artwork paints its own tile, so only the four corners outside its 40px
// radius are uncovered — and a launcher expects those transparent, not white.
await page.screenshot({ path: output, omitBackground: true });
await browser.close();

console.log(`[gen-icon] wrote ${output} (${SIZE}x${SIZE})`);
console.log("[gen-icon] now run: npx tauri icon app-icon.png");
