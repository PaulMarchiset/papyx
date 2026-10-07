import type { DecodedImage } from "@/lib/pdf/heif";

/**
 * Camera RAW decoding — DNG, and the proprietary formats beside it (CR2/CR3,
 * NEF, ARW, RAF, ORF, RW2…).
 *
 * A RAW file is not a picture yet: it is the sensor's mosaic, one colour per
 * photosite, before white balance, demosaicing and colour conversion. Reading
 * one means doing what the camera would have done, and LibRaw (built to wasm,
 * run in its own worker) is the library that knows how for every camera worth
 * the name. Its output is what the camera's own JPEG would roughly have been:
 * as-shot white balance, sRGB, orientation applied.
 *
 * It is a megabyte and a half, so like libheif it is imported lazily — a
 * session that never opens a RAW never loads it.
 *
 * The package is built with pthreads but runs single-threaded without
 * SharedArrayBuffer, which is what lets it work here without making the app
 * cross-origin isolated (and every one of its pages pay for that).
 */

export const RAW_EXTENSIONS = [
  "dng", "cr2", "cr3", "crw", "nef", "nrw", "arw", "srf", "sr2", "raf", "orf",
  "rw2", "rwl", "pef", "srw", "x3f", "3fr", "fff", "iiq", "erf", "kdc", "dcr",
  "mrw", "mos", "raw",
];

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

/** Compressions only a camera writes — a plain TIFF never carries these. */
const VENDOR_COMPRESSIONS = new Set([32767, 32769, 32770, 32867, 34713, 65000, 65535]);

/**
 * Recognises a RAW from its bytes. Most RAW formats *are* TIFF files, so the
 * hard case is telling a DNG or a NEF from a scanner's TIFF: the answer is in
 * the first directory, which for a RAW either declares a DNG version, holds a
 * colour-filter mosaic, uses a vendor compression, or is a camera's preview
 * with the real image hung off it as a sub-directory.
 *
 * A miss in the other direction is cheap: decodeToCanvas hands a "RAW" LibRaw
 * refuses back to the TIFF decoder.
 */
export function isRaw(bytes: Uint8Array): boolean {
  if (bytes.length < 16) return false;
  if (ascii(bytes, 0, 15) === "FUJIFILMCCD-RAW") return true; // RAF
  if (ascii(bytes, 4, 8) === "ftypcrx ") return true; // CR3
  if (ascii(bytes, 6, 8) === "HEAPCCDR") return true; // CRW
  if (ascii(bytes, 0, 4) === "FOVb") return true; // X3F
  if (ascii(bytes, 0, 4) === "\0MRM") return true; // MRW

  const order = ascii(bytes, 0, 2);
  if (order !== "II" && order !== "MM") return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const little = order === "II";
  const magic = view.getUint16(2, little);
  // ORF swaps the TIFF magic for "RO"/"RS", RW2 for 0x55.
  if (magic === 0x4f52 || magic === 0x5352 || magic === 0x55) return true;
  if (magic !== 42) return false;
  if (ascii(bytes, 8, 2) === "CR") return true; // CR2

  const ifd = view.getUint32(4, little);
  if (ifd + 2 > bytes.length) return false;
  const count = view.getUint16(ifd, little);
  const tags = new Map<number, number>();
  for (let i = 0; i < count; i++) {
    const at = ifd + 2 + i * 12;
    if (at + 12 > bytes.length) break;
    const type = view.getUint16(at + 2, little);
    // Only the first value matters, and every tag read below is a SHORT or a
    // LONG small enough to sit inline.
    const value = type === 3 ? view.getUint16(at + 8, little) : view.getUint32(at + 8, little);
    tags.set(view.getUint16(at, little), value);
  }
  if (tags.has(50706)) return true; // DNGVersion
  const photometric = tags.get(262);
  if (photometric === 32803 || photometric === 34892) return true; // CFA, LinearRaw
  if (VENDOR_COMPRESSIONS.has(tags.get(259) ?? 1)) return true;
  return tags.has(271) && tags.has(330); // Make + SubIFDs: NEF, ARW and kin
}

export interface RawDecodeOptions {
  /**
   * Half-size output, skipping the demosaic: four times fewer pixels and many
   * times faster. Plenty for a tray thumbnail, wrong for a conversion.
   */
  half?: boolean;
}

export async function decodeRaw(
  bytes: Uint8Array,
  { half = false }: RawDecodeOptions = {},
): Promise<DecodedImage> {
  const { default: LibRaw } = await import("libraw-wasm");
  // One decoder per file, disposed straight after: the worker's wasm memory
  // grows to the size of the largest image it has seen and never gives it
  // back, and a 45-megapixel RAW would otherwise stay resident all session.
  const raw = new LibRaw();
  try {
    // open() transfers the buffer it is given into the worker, which detaches
    // it here — a SourceFile is reused across runs, so it gets a copy.
    await raw.open(bytes.slice(), {
      useCameraWb: true,
      halfSize: half,
      // PPG rather than LibRaw's default AHD: on a 26-megapixel ARW it was
      // indistinguishable at 100% and took 6s instead of 12 — single-threaded
      // wasm makes the demosaic nearly all of the wait. Linear (0) was faster
      // still, but left zipper fringes along every hard edge.
      userQual: 2,
      outputBps: 8,
      outputColor: 1, // sRGB
    });
    const image = await raw.imageData();
    if (!image || image.bits !== 8 || (image.colors !== 3 && image.colors !== 1)) {
      throw new Error("raw-decode-failed");
    }
    const source = image.data as Uint8Array;
    const pixels = image.width * image.height;
    const data = new Uint8ClampedArray(pixels * 4);
    for (let i = 0, from = 0; i < pixels; i++, from += image.colors) {
      const to = i * 4;
      data[to] = source[from];
      data[to + 1] = source[from + (image.colors === 3 ? 1 : 0)];
      data[to + 2] = source[from + (image.colors === 3 ? 2 : 0)];
      data[to + 3] = 255;
    }
    return { width: image.width, height: image.height, data };
  } finally {
    raw.dispose();
  }
}
