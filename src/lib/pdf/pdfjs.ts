import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
// Vite turns this into a URL for a chunk it emits, so the worker is loaded from
// the app bundle itself — never from a CDN.
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

/** Thrown when a document needs a password we don't have (or have wrong). */
export class PasswordRequiredError extends Error {
  constructor(public readonly wrongPassword: boolean) {
    super(wrongPassword ? "wrong-password" : "password-required");
    this.name = "PasswordRequiredError";
  }
}

export interface LoadedDocument {
  doc: PDFDocumentProxy;
  /** Tears down the worker transport. Always call it, ideally in a finally. */
  close: () => Promise<void>;
}

/**
 * Opens a document with pdf.js for anything that needs the *rendered* page:
 * thumbnails, rasterizing, text extraction. Structural edits go through pdf-lib
 * instead (see document.ts).
 *
 * The byte array is copied because pdf.js takes ownership of the buffer it is
 * given and detaches it — the caller's `SourceFile.bytes` has to stay usable
 * for the next run.
 */
export async function openDocument(
  bytes: Uint8Array,
  password?: string,
): Promise<LoadedDocument> {
  const task = pdfjs.getDocument({
    data: new Uint8Array(bytes),
    password,
    cMapUrl: "/pdfjs/cmaps/",
    cMapPacked: true,
    standardFontDataUrl: "/pdfjs/standard_fonts/",
    // A PDF is untrusted input and nothing here needs the XFA form engine.
    enableXfa: false,
  });
  try {
    const doc = await task.promise;
    return { doc, close: () => task.destroy() };
  } catch (e) {
    if (e instanceof pdfjs.PasswordException) {
      throw new PasswordRequiredError(
        e.code === pdfjs.PasswordResponses.INCORRECT_PASSWORD,
      );
    }
    throw e;
  }
}

/** 72 pt = 1 inch, so a DPI is just a scale factor on the default viewport. */
export const PDF_POINTS_PER_INCH = 72;

export function scaleForDpi(dpi: number): number {
  return dpi / PDF_POINTS_PER_INCH;
}

/**
 * Renders one page onto a fresh canvas. `scale` 1 gives the page's natural
 * point size in CSS pixels (i.e. 72 dpi).
 */
export async function renderPage(
  doc: PDFDocumentProxy,
  pageNumber: number,
  scale: number,
): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(viewport.width));
  canvas.height = Math.max(1, Math.round(viewport.height));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas-unavailable");
  // Pages are transparent by default; paper white keeps JPEG output (which has
  // no alpha channel) from coming out black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  page.cleanup();
  return canvas;
}

/** Renders a page scaled to fit `maxWidth` px — used for the page grid. */
export async function renderThumbnail(
  doc: PDFDocumentProxy,
  pageNumber: number,
  maxWidth: number,
): Promise<string> {
  const page = await doc.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  page.cleanup();
  const canvas = await renderPage(doc, pageNumber, maxWidth / base.width);
  return canvas.toDataURL("image/png");
}

export async function canvasToBytes(
  canvas: HTMLCanvasElement,
  mime: "image/png" | "image/jpeg" | "image/webp",
  quality?: number,
): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mime, quality),
  );
  if (!blob) throw new Error("encode-failed");
  return new Uint8Array(await blob.arrayBuffer());
}
