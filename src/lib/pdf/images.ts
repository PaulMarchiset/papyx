import type { PDFDocument, PDFImage } from "pdf-lib";
import { canvasToBytes, createCanvas } from "@/lib/pdf/canvas";
import { HEIF_EXTENSIONS, decodeHeif, isHeif } from "@/lib/pdf/heif";

/**
 * Image decoding helpers shared by the images→PDF, watermark and convert tools.
 *
 * pdf-lib can embed baseline JPEG and PNG directly, which is the good path: the
 * original compressed bytes go into the file untouched. Anything else (WebP,
 * AVIF, GIF, BMP, TIFF where the platform decodes it, CMYK JPEGs pdf-lib
 * chokes on) is decoded by the browser and re-encoded once, which is lossy but
 * is the only way to get those formats into a PDF at all. HEIC is the one
 * format the browser cannot decode either — see heif.ts.
 */

export const IMAGE_EXTENSIONS = [
  "png", "jpg", "jpeg", "webp", "avif", "gif", "bmp", "tif", "tiff",
  ...HEIF_EXTENSIONS,
];

const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

function startsWith(bytes: Uint8Array, magic: number[]): boolean {
  return magic.every((b, i) => bytes[i] === b);
}

/**
 * Decodes any supported image onto a canvas. Everything the WebView knows goes
 * through createImageBitmap; HEIC takes the wasm detour and arrives as raw
 * RGBA, which is the only difference the callers ever see.
 */
export async function decodeToCanvas(bytes: Uint8Array): Promise<HTMLCanvasElement> {
  if (isHeif(bytes)) {
    const image = await decodeHeif(bytes);
    return createCanvas(image.width, image.height, (ctx) =>
      ctx.putImageData(new ImageData(image.data, image.width, image.height), 0, 0),
    );
  }
  const bitmap = await createImageBitmap(new Blob([bytes as BlobPart]));
  try {
    return createCanvas(bitmap.width, bitmap.height, (ctx) => ctx.drawImage(bitmap, 0, 0));
  } finally {
    bitmap.close();
  }
}

/**
 * A small data-URL preview, for the formats the tray cannot hand straight to an
 * <img>. Everything else gets a blob URL for free and never comes through here.
 */
export async function imageThumbnail(bytes: Uint8Array, maxEdge: number): Promise<string> {
  const source = await decodeToCanvas(bytes);
  const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  return createCanvas(width, height, (ctx) =>
    ctx.drawImage(source, 0, 0, width, height),
  ).toDataURL("image/jpeg", 0.8);
}

/** Re-encodes anything we can decode into a PNG or JPEG. */
async function transcode(bytes: Uint8Array): Promise<{ bytes: Uint8Array; jpeg: boolean }> {
  const canvas = await decodeToCanvas(bytes);
  // PNG keeps transparency, which matters for logos dropped in as watermarks.
  // A phone photo is the other extreme: twelve megapixels of PNG would add
  // thirty megabytes to the document where JPEG adds one, so HEIC — which only
  // ever arrives as a photo — takes the lossy path instead.
  const jpeg = isHeif(bytes);
  return {
    bytes: await canvasToBytes(canvas, jpeg ? "image/jpeg" : "image/png", jpeg ? 0.92 : undefined),
    jpeg,
  };
}

/** Embeds any supported image into `doc`, transcoding only when it has to. */
export async function embedImage(doc: PDFDocument, bytes: Uint8Array): Promise<PDFImage> {
  if (startsWith(bytes, PNG_MAGIC)) {
    try {
      return await doc.embedPng(bytes);
    } catch {
      /* fall through to transcode */
    }
  }
  if (startsWith(bytes, JPEG_MAGIC)) {
    try {
      return await doc.embedJpg(bytes);
    } catch {
      /* progressive or CMYK JPEG — let the browser decode it instead */
    }
  }
  const transcoded = await transcode(bytes);
  return transcoded.jpeg ? doc.embedJpg(transcoded.bytes) : doc.embedPng(transcoded.bytes);
}
