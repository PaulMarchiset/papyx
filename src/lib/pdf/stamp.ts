import type { ProgressCallback } from "@/lib/pdf/progress";
import { StandardFonts, degrees, rgb } from "pdf-lib";
import { loadPdf, MM_TO_POINTS, savePdf } from "@/lib/pdf/document";
import {
  displayedSize,
  normalizeAngle,
  screenToPdf,
  type Point,
} from "@/lib/pdf/placement";

/**
 * Text stamped onto existing pages: watermarks and page numbers. Both draw with
 * Helvetica, one of the 14 standard fonts every PDF reader already has, so
 * nothing is embedded and the file barely grows.
 */

export type Corner =
  | "top-left" | "top-center" | "top-right"
  | "bottom-left" | "bottom-center" | "bottom-right";

/**
 * Helvetica is WinAnsi-encoded: it covers Latin-1 (so all of French) but throws
 * on anything outside it. Rather than failing a whole job over one smart quote
 * pasted from a word processor, fold the usual typographic strays down to their
 * ASCII equivalents and replace whatever is still unencodable.
 */
export function toWinAnsi(text: string): string {
  const folded = text
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0|\u202F|\u2009/g, " ");
  // WinAnsi is Latin-1 plus a handful of printable characters in 0x80..0x9F.
  const extras = "€‚ƒ„…†‡ˆ‰Š‹Œ Ž ‘’“”•–—˜™š›œ žŸ";
  return [...folded]
    .map((ch) => {
      const code = ch.codePointAt(0)!;
      if (code === 0x0a || code === 0x0d) return ch;
      if (code >= 0x20 && code <= 0x7e) return ch;
      if (code >= 0xa0 && code <= 0xff) return ch;
      return extras.includes(ch) ? ch : "?";
    })
    .join("");
}

export function hexToRgb(hex: string) {
  const m = /^#?([\da-f]{6})$/i.exec(hex.trim());
  const value = m ? parseInt(m[1], 16) : 0;
  return rgb(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
}

export interface WatermarkOptions {
  text: string;
  fontSize: number;
  /** 0..1 */
  opacity: number;
  /** Counter-clockwise, in degrees. */
  angle: number;
  color: string;
  /** "tile" repeats the text across the whole page. */
  layout: "center" | "tile" | Corner;
  marginMm: number;
  /** 1-based; empty means every page. */
  pages: number[];
}

export const DEFAULT_WATERMARK: WatermarkOptions = {
  text: "CONFIDENTIEL",
  fontSize: 48,
  opacity: 0.25,
  angle: 45,
  color: "#c4502e",
  layout: "center",
  marginMm: 10,
  pages: [],
};

/** Bottom-left anchor for a text box of `width`×`height` inside a page. */
function anchor(
  corner: Corner,
  pageWidth: number,
  pageHeight: number,
  width: number,
  height: number,
  margin: number,
): { x: number; y: number } {
  const x = corner.endsWith("left")
    ? margin
    : corner.endsWith("right")
      ? pageWidth - width - margin
      : (pageWidth - width) / 2;
  const y = corner.startsWith("top") ? pageHeight - height - margin : margin;
  return { x, y };
}

export async function watermarkPdf(
  file: { bytes: Uint8Array },
  options: WatermarkOptions,
  onProgress?: ProgressCallback,
): Promise<Uint8Array> {
  const doc = await loadPdf(file.bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const text = toWinAnsi(options.text);
  if (text.trim() === "") throw new Error("empty-text");

  const color = hexToRgb(options.color);
  const margin = options.marginMm * MM_TO_POINTS;
  const width = font.widthOfTextAtSize(text, options.fontSize);
  const height = font.heightAtSize(options.fontSize);
  const selected = new Set(options.pages);
  const pages = doc.getPages();

  for (const [index, page] of pages.entries()) {
    if (selected.size > 0 && !selected.has(index + 1)) continue;
    const { width: pw, height: ph } = page.getSize();
    const pageRotation = normalizeAngle(page.getRotation().angle);
    const view = displayedSize(pw, ph, pageRotation);
    // Everything below is computed on the page as displayed, then mapped back
    // into page space; the rotation is added to the text angle so the stamp
    // reads at the requested angle on screen. See lib/pdf/placement.ts.
    const place = (point: Point) => screenToPdf(point, pw, ph, pageRotation);
    const common = {
      font,
      size: options.fontSize,
      color,
      opacity: options.opacity,
      rotate: degrees(options.angle + pageRotation),
    };

    if (options.layout === "tile") {
      // Step the grid by the extent of the rotated text so tilted stamps still
      // tile without running into each other.
      const radians = (options.angle * Math.PI) / 180;
      const stepX = Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians)) + 40;
      const stepY = Math.abs(width * Math.sin(radians)) + Math.abs(height * Math.cos(radians)) + 40;
      for (let y = 0; y < view.height + stepY; y += stepY) {
        for (let x = 0; x < view.width + stepX; x += stepX) {
          page.drawText(text, { ...common, ...place({ x, y }) });
        }
      }
    } else if (options.layout === "center") {
      // Text rotates about its anchor, so the anchor is offset by half of the
      // rotated extent to land the visual centre on the centre of the page.
      const radians = (options.angle * Math.PI) / 180;
      page.drawText(text, {
        ...common,
        ...place({
          x: view.width / 2 - (width * Math.cos(radians) - height * Math.sin(radians)) / 2,
          y: view.height / 2 - (width * Math.sin(radians) + height * Math.cos(radians)) / 2,
        }),
      });
    } else {
      page.drawText(text, {
        ...common,
        ...place(anchor(options.layout, view.width, view.height, width, height, margin)),
        rotate: degrees(pageRotation),
      });
    }

    await onProgress?.(index + 1, pages.length);
  }

  return savePdf(doc);
}

export interface PageNumberOptions {
  /** `{n}` = page number, `{total}` = page count. */
  format: string;
  position: Corner;
  fontSize: number;
  color: string;
  marginMm: number;
  /** Number printed on the first numbered page. */
  startAt: number;
  /** 1-based pages to stamp; empty means every page. */
  pages: number[];
}

export const DEFAULT_PAGE_NUMBERS: PageNumberOptions = {
  format: "{n} / {total}",
  position: "bottom-center",
  fontSize: 10,
  color: "#232320",
  marginMm: 12,
  startAt: 1,
  pages: [],
};

export async function addPageNumbers(
  file: { bytes: Uint8Array },
  options: PageNumberOptions,
  onProgress?: ProgressCallback,
): Promise<Uint8Array> {
  const doc = await loadPdf(file.bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const color = hexToRgb(options.color);
  const margin = options.marginMm * MM_TO_POINTS;
  const pages = doc.getPages();
  const selected = options.pages.length > 0 ? options.pages : pages.map((_, i) => i + 1);
  const total = selected.length;

  for (const [ordinal, pageNumber] of selected.entries()) {
    const page = pages[pageNumber - 1];
    if (!page) continue;
    const label = toWinAnsi(
      options.format
        .replace(/\{n\}/g, String(options.startAt + ordinal))
        .replace(/\{total\}/g, String(options.startAt + total - 1)),
    );
    const { width: pw, height: ph } = page.getSize();
    const pageRotation = normalizeAngle(page.getRotation().angle);
    const view = displayedSize(pw, ph, pageRotation);
    const width = font.widthOfTextAtSize(label, options.fontSize);
    const height = font.heightAtSize(options.fontSize);
    // "Bottom centre" has to mean the bottom of the page as the reader sees it,
    // which is not the bottom of the page box once /Rotate is involved.
    const point = screenToPdf(
      anchor(options.position, view.width, view.height, width, height, margin),
      pw,
      ph,
      pageRotation,
    );
    page.drawText(label, {
      ...point,
      font,
      size: options.fontSize,
      color,
      rotate: degrees(pageRotation),
    });
    await onProgress?.(ordinal + 1, total);
  }

  return savePdf(doc);
}
