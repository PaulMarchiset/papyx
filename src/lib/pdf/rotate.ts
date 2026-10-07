import type { PDFPage } from "pdf-lib";
import type { ProgressCallback } from "@/lib/pdf/progress";
import { loadPdf, normalizeRotation, savePdf } from "@/lib/pdf/document";

/** Clockwise, in degrees. */
export type Turn = 90 | 180 | 270;

/**
 * Which pages turn. The orientation scopes are rules rather than lists, which
 * is what makes them work across a batch: "every landscape page" means the
 * right pages in each document, where "pages 2 and 5" would not.
 */
export type RotateScope = "all" | "landscape" | "portrait" | "pages";

export interface RotateOptions {
  turn: Turn;
  scope: RotateScope;
  /** 1-based; read only when `scope` is "pages". */
  pages: number[];
}

/**
 * How the page is *seen*: its crop box — what a viewer shows — turned by the
 * rotation it already carries. A landscape scan stored on its side with
 * /Rotate 90 is a portrait page as far as anyone is concerned.
 */
export function displayedOrientation(page: PDFPage): "landscape" | "portrait" {
  const { width, height } = page.getCropBox();
  const sideways = page.getRotation().angle % 180 !== 0;
  const [w, h] = sideways ? [height, width] : [width, height];
  return w > h ? "landscape" : "portrait";
}

/**
 * Turns pages in place. Only /Rotate changes, on the document as loaded —
 * unlike organizePdf, which copies pages into a new document, this keeps
 * bookmarks, form fields, links and everything else that lives above the pages.
 *
 * `rotated` lets the caller tell "nothing matched" apart from success: a
 * landscape-only pass over an all-portrait document would otherwise hand back
 * an identical file without a word.
 */
export async function rotatePdf(
  file: { bytes: Uint8Array },
  options: RotateOptions,
  onProgress?: ProgressCallback,
): Promise<{ bytes: Uint8Array; rotated: number }> {
  const doc = await loadPdf(file.bytes);
  const pages = doc.getPages();
  const chosen = new Set(options.pages);
  let rotated = 0;

  for (const [index, page] of pages.entries()) {
    const turns =
      options.scope === "all" ||
      (options.scope === "pages" && chosen.has(index + 1)) ||
      (options.scope !== "pages" && displayedOrientation(page) === options.scope);
    if (turns) {
      page.setRotation(normalizeRotation(page.getRotation().angle + options.turn));
      rotated++;
    }
    await onProgress?.(index + 1, pages.length);
  }

  return { bytes: rotated > 0 ? await savePdf(doc) : file.bytes, rotated };
}
