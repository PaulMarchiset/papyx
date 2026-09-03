import type { PDFDocument, PDFImage } from "pdf-lib";

/**
 * Image decoding helpers shared by the images→PDF and watermark tools.
 *
 * pdf-lib can embed baseline JPEG and PNG directly, which is the good path: the
 * original compressed bytes go into the file untouched. Anything else (WebP,
 * AVIF, GIF, BMP, TIFF where the platform decodes it, CMYK JPEGs pdf-lib
 * chokes on) is decoded by the browser and re-encoded once, which is lossy but
 * is the only way to get those formats into a PDF at all.
 */

export const IMAGE_EXTENSIONS = [
  "png", "jpg", "jpeg", "webp", "avif", "gif", "bmp", "tif", "tiff",
];

const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

function startsWith(bytes: Uint8Array, magic: number[]): boolean {
  return magic.every((b, i) => bytes[i] === b);
}

/** Re-encodes anything the browser can decode into a PNG or JPEG. */
async function transcode(bytes: Uint8Array): Promise<{ bytes: Uint8Array; jpeg: boolean }> {
  const blob = new Blob([bytes as BlobPart]);
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas-unavailable");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  // PNG keeps transparency, which matters for logos dropped in as watermarks.
  const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (!out) throw new Error("encode-failed");
  return { bytes: new Uint8Array(await out.arrayBuffer()), jpeg: false };
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
