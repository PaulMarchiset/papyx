/**
 * The canvas side of image work: the raster formats the app can write, and the
 * two helpers that get pixels onto a canvas and bytes back off it.
 *
 * Kept out of pdfjs.ts so the image tools — which have no business loading a
 * PDF engine — can encode without dragging pdf.js in behind them.
 */

export type ImageFormat = "png" | "jpeg" | "webp";

export type ImageMime = "image/png" | "image/jpeg" | "image/webp";

export const MIME: Record<ImageFormat, ImageMime> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

/** The extension a format is written with — "jpeg" is spelled .jpg on disk. */
export function extensionFor(format: ImageFormat): string {
  return format === "jpeg" ? "jpg" : format;
}

export function createCanvas(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas-unavailable");
  draw(ctx);
  return canvas;
}

export async function canvasToBytes(
  canvas: HTMLCanvasElement,
  mime: ImageMime,
  quality?: number,
): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mime, quality),
  );
  if (!blob) throw new Error("encode-failed");
  return new Uint8Array(await blob.arrayBuffer());
}
