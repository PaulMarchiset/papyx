/**
 * Copies pdf.js's CMap tables and standard-font files out of node_modules into
 * public/pdfjs/, so they ship with the app and are served from disk.
 *
 * Without them, PDFs that use CJK encodings or that reference the 14 standard
 * fonts without embedding them render blank or with fallback glyphs. pdf.js
 * fetches these lazily from `cMapUrl` / `standardFontDataUrl` (see
 * src/lib/pdf/pdfjs.ts) — pointing those at a CDN would break the "nothing
 * leaves this machine" promise, so we vendor them instead.
 */
import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "pdfjs-dist");
const to = join(root, "public", "pdfjs");

if (!existsSync(from)) {
  console.warn("[pdfjs-assets] pdfjs-dist not installed yet — skipping.");
  process.exit(0);
}

await rm(to, { recursive: true, force: true });
await mkdir(to, { recursive: true });
for (const dir of ["cmaps", "standard_fonts"]) {
  await cp(join(from, dir), join(to, dir), { recursive: true });
}
console.log("[pdfjs-assets] copied cmaps + standard_fonts to public/pdfjs/");
