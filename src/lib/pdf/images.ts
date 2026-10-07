import type { PDFDocument, PDFImage } from "pdf-lib";
import { canvasToBytes, createCanvas } from "@/lib/pdf/canvas";
import { HEIF_EXTENSIONS, decodeHeif, isHeif, type DecodedImage } from "@/lib/pdf/heif";
import { RAW_EXTENSIONS, decodeRaw, isRaw } from "@/lib/pdf/raw";
import { decodeTiff, isTiff } from "@/lib/pdf/tiff";

/**
 * Image decoding helpers shared by the images→PDF, watermark and convert tools.
 *
 * pdf-lib can embed baseline JPEG and PNG directly, which is the good path: the
 * original compressed bytes go into the file untouched. Anything else (WebP,
 * AVIF, GIF, BMP, CMYK JPEGs pdf-lib chokes on) is decoded by the browser and
 * re-encoded once, which is lossy but is the only way to get those formats into
 * a PDF at all. Three families the browser cannot decode either each have a
 * wasm or JS decoder of their own, loaded on first use: HEIC (heif.ts), camera
 * RAW (raw.ts) and TIFF (tiff.ts).
 */

export const IMAGE_EXTENSIONS = [
  "png", "jpg", "jpeg", "webp", "avif", "gif", "bmp", "tif", "tiff",
  ...HEIF_EXTENSIONS,
  ...RAW_EXTENSIONS,
];

const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

function startsWith(bytes: Uint8Array, magic: number[]): boolean {
  return magic.every((b, i) => bytes[i] === b);
}

/**
 * True for the formats an <img> cannot show — the tray has to decode those
 * itself to get a thumbnail. Order matters in the checks below as well: most
 * RAW formats are TIFF files, so the RAW test has to run first.
 */
export function needsDecoder(bytes: Uint8Array): boolean {
  return isHeif(bytes) || isRaw(bytes) || isTiff(bytes);
}

/** A photograph in all but name: re-encoding it as PNG would be wasteful. */
function isPhoto(bytes: Uint8Array): boolean {
  return isHeif(bytes) || isRaw(bytes);
}

function fromPixels(image: DecodedImage): HTMLCanvasElement {
  return createCanvas(image.width, image.height, (ctx) =>
    ctx.putImageData(new ImageData(image.data, image.width, image.height), 0, 0),
  );
}

async function decodePixels(bytes: Uint8Array, preview: boolean): Promise<DecodedImage | null> {
  if (isHeif(bytes)) return decodeHeif(bytes);
  if (isRaw(bytes)) {
    try {
      return await decodeRaw(bytes, { half: preview });
    } catch (error) {
      // The sniff took an ordinary TIFF for a camera file; let UTIF have it.
      if (!isTiff(bytes)) throw error;
    }
  }
  if (isTiff(bytes)) return decodeTiff(bytes);
  return null;
}

/**
 * Decodes any supported image onto a canvas. Everything the WebView knows goes
 * through createImageBitmap; HEIC, RAW and TIFF take a decoder of their own and
 * arrive as raw RGBA, which is the only difference the callers ever see.
 */
export async function decodeToCanvas(
  bytes: Uint8Array,
  { preview = false }: { preview?: boolean } = {},
): Promise<HTMLCanvasElement> {
  const pixels = await decodePixels(bytes, preview);
  if (pixels) return fromPixels(pixels);
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
  // A RAW at half size is still several times the thumbnail, and skips the
  // demosaic that makes a full decode take seconds.
  const source = await decodeToCanvas(bytes, { preview: true });
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
  // thirty megabytes to the document where JPEG adds one, so HEIC and RAW —
  // which only ever arrive as photos — take the lossy path instead. A TIFF
  // stays lossless: whoever scanned to TIFF chose that on purpose.
  const jpeg = isPhoto(bytes);
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
