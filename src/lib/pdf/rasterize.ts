import type { ProgressCallback } from "@/lib/pdf/progress";
import { PDFDocument } from "pdf-lib";
import { savePdf } from "@/lib/pdf/document";
import { openDocument, renderPage, scaleForDpi } from "@/lib/pdf/pdfjs";
import { MIME, canvasToBytes, extensionFor, type ImageFormat } from "@/lib/pdf/canvas";
import type { OutputFile } from "@/lib/types";
import { stem } from "@/lib/format";

export interface PdfToImagesOptions {
  format: ImageFormat;
  dpi: number;
  /** 0..1, ignored for PNG. */
  quality: number;
  /** 1-based; empty means every page. */
  pages: number[];
  password?: string;
}

export const DEFAULT_PDF_TO_IMAGES: PdfToImagesOptions = {
  format: "png",
  dpi: 150,
  quality: 0.9,
  pages: [],
};

export async function pdfToImages(
  file: { name: string; bytes: Uint8Array },
  options: PdfToImagesOptions,
  onProgress?: ProgressCallback,
): Promise<OutputFile[]> {
  const { doc, close } = await openDocument(file.bytes, options.password);
  try {
    // A locked file has no known page count until pdf.js opens it, so the
    // selection is only bounded here.
    const pages =
      options.pages.length > 0
        ? options.pages.filter((n) => n >= 1 && n <= doc.numPages)
        : Array.from({ length: doc.numPages }, (_, i) => i + 1);
    const base = stem(file.name);
    const width = String(doc.numPages).length;
    const outputs: OutputFile[] = [];

    for (const [index, pageNumber] of pages.entries()) {
      const canvas = await renderPage(doc, pageNumber, scaleForDpi(options.dpi));
      const bytes = await canvasToBytes(
        canvas,
        MIME[options.format],
        options.format === "png" ? undefined : options.quality,
      );
      outputs.push({
        name: `${base}_${String(pageNumber).padStart(width, "0")}.${extensionFor(options.format)}`,
        bytes,
        mime: MIME[options.format],
      });
      await onProgress?.(index + 1, pages.length);
    }
    return outputs;
  } finally {
    await close();
  }
}

export interface CompressOptions {
  /** Render resolution. Lower = smaller file, softer text. */
  dpi: number;
  /** JPEG quality, 0..1. */
  quality: number;
  grayscale: boolean;
  password?: string;
}

export const DEFAULT_COMPRESS: CompressOptions = {
  dpi: 120,
  quality: 0.7,
  grayscale: false,
};

/**
 * Rasterizing compressor: every page is re-rendered at `dpi`, JPEG-encoded and
 * laid back down on a page of the original size.
 *
 * This is the one operation in the app that is genuinely destructive — the
 * output has no selectable text, no vector art and no annotations. It is also
 * the only compression that works without a full PDF object rewriter, and it is
 * what actually shrinks the scans people want to shrink. The UI says so.
 */
export async function compressPdf(
  file: { bytes: Uint8Array },
  options: CompressOptions,
  onProgress?: ProgressCallback,
): Promise<Uint8Array> {
  const { doc: source, close } = await openDocument(file.bytes, options.password);
  try {
    const out = await PDFDocument.create();

    for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber++) {
      const page = await source.getPage(pageNumber);
      // The *rotated* viewport is the page as a reader sees it, which is what
      // the raster matches — so the new page has to use those dimensions.
      const viewport = page.getViewport({ scale: 1 });
      page.cleanup();

      let canvas = await renderPage(source, pageNumber, scaleForDpi(options.dpi));
      if (options.grayscale) canvas = toGrayscale(canvas);
      const jpeg = await canvasToBytes(canvas, "image/jpeg", options.quality);

      const embedded = await out.embedJpg(jpeg);
      const target = out.addPage([viewport.width, viewport.height]);
      target.drawImage(embedded, {
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height,
      });
      await onProgress?.(pageNumber, source.numPages);
    }

    return savePdf(out);
  } finally {
    await close();
  }
}

function toGrayscale(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = canvas.width;
  out.height = canvas.height;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("canvas-unavailable");
  ctx.filter = "grayscale(1)";
  ctx.drawImage(canvas, 0, 0);
  return out;
}
