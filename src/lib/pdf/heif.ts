import type { LibHeif } from "libheif-js/libheif-wasm/libheif-bundle.mjs";

/**
 * HEIF/HEIC decoding — the one image format the WebView cannot read on its own.
 *
 * HEIC wraps an HEVC bitstream, and Chromium ships no HEVC decoder, so
 * `createImageBitmap` throws on an iPhone photo while decoding AVIF out of the
 * very same container without blinking. libheif (the C library built to wasm,
 * libde265 inside) fills that gap.
 *
 * It is a megabyte, so it is imported lazily: a session that never opens a HEIC
 * never loads it. Everything else about images stays in images.ts.
 */

export const HEIF_EXTENSIONS = ["heic", "heif", "hif"];

/**
 * The ftyp brands that mean "HEIF carrying HEVC". AVIF is deliberately absent:
 * it is the same ISO-BMFF container with an AV1 payload, and Chromium decodes
 * that natively — sending it here would be slower and lose the 10-bit range.
 */
const HEIF_BRANDS = new Set([
  "heic", "heix", "heim", "heis", "hevc", "hevx", "hevm", "hevs", "mif1", "msf1",
]);

/** AVIF declares `mif1` among its compatible brands, so it has to be excluded. */
const AVIF_BRANDS = new Set(["avif", "avis"]);

function fourcc(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + 4));
}

/**
 * Recognises a HEIF file from its bytes rather than its name: the tray also
 * takes files dropped from anywhere, and an extension is a claim, not a fact.
 */
export function isHeif(bytes: Uint8Array): boolean {
  // ISO-BMFF opens with [size][ftyp][major brand][minor version][compatible…].
  if (bytes.length < 12 || fourcc(bytes, 4) !== "ftyp") return false;
  const declared = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  const size = Math.min(declared, bytes.length);
  const brands = [fourcc(bytes, 8)];
  for (let at = 16; at + 4 <= size; at += 4) brands.push(fourcc(bytes, at));
  if (brands.some((brand) => AVIF_BRANDS.has(brand))) return false;
  return brands.some((brand) => HEIF_BRANDS.has(brand));
}

export interface DecodedImage {
  width: number;
  height: number;
  /** RGBA, row-major, four bytes per pixel. */
  data: Uint8ClampedArray;
}

let library: Promise<LibHeif> | null = null;

function load(): Promise<LibHeif> {
  // The deep path is on purpose: the package's own entry points are CommonJS
  // and reach for `fs`, while this one is ESM with the wasm inlined — which is
  // what lets the bundler turn it into a chunk fetched on first use, with no
  // extra asset to copy alongside the app (unlike public/pdfjs/).
  library ??= import("libheif-js/libheif-wasm/libheif-bundle.mjs").then((module) =>
    module.default(),
  );
  return library;
}

export async function decodeHeif(bytes: Uint8Array): Promise<DecodedImage> {
  const libheif = await load();
  // decode() hands back every top-level image in the file: the frames of a
  // burst, the stills of a Live Photo, the depth map an iPhone stores beside
  // the picture. The first one is what the user means by "the photo".
  const images = new libheif.HeifDecoder().decode(bytes);
  if (images.length === 0) throw new Error("heif-decode-failed");
  try {
    const [image] = images;
    const target: DecodedImage = {
      width: image.get_width(),
      height: image.get_height(),
      data: new Uint8ClampedArray(image.get_width() * image.get_height() * 4),
    };
    await new Promise<void>((resolve, reject) => {
      // display() fills the buffer from a timeout and reports failure by
      // passing null back rather than by throwing.
      image.display(target, (result) =>
        result ? resolve() : reject(new Error("heif-decode-failed")),
      );
    });
    return target;
  } finally {
    for (const image of images) image.free();
  }
}
