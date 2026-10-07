import type { DecodedImage } from "@/lib/pdf/heif";

/**
 * TIFF decoding. Chromium — and therefore the WebView2 the app runs in — has
 * never decoded TIFF, which is what a flatbed scanner writes by default. UTIF
 * (Photopea's decoder, pure JS) reads the compressions scanners actually use:
 * none, LZW, Deflate, PackBits, CCITT fax for black-and-white, and JPEG.
 *
 * Small as it is, it is only reached through a dynamic import, like the other
 * decoders — most sessions never see a TIFF.
 */

export function isTiff(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 8 &&
    ((bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 42 && bytes[3] === 0) ||
      (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0 && bytes[3] === 42))
  );
}

type Utif = typeof import("utif2");

export async function decodeTiff(bytes: Uint8Array): Promise<DecodedImage> {
  // The package is CommonJS; depending on who bundled it, its functions arrive
  // on the namespace or on `default`.
  const module = (await import("utif2")) as Utif & { default?: Utif };
  const UTIF = module.default ?? module;
  const buffer = bytes.slice().buffer;
  const pages = UTIF.decode(buffer);
  // The first full-resolution page. Bit 0 of NewSubfileType marks a
  // reduced-resolution copy — a preview some writers put first.
  const page =
    pages.find((ifd) => ((ifd.t254 as number[] | undefined)?.[0] ?? 0) % 2 === 0) ?? pages[0];
  if (!page) throw new Error("tiff-decode-failed");
  UTIF.decodeImage(buffer, page);
  if (!page.width || !page.height) throw new Error("tiff-decode-failed");
  const rgba = UTIF.toRGBA8(page);
  return {
    width: page.width,
    height: page.height,
    data: new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, page.width * page.height * 4),
  };
}
