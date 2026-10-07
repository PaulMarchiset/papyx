import { deflateSync } from "node:zlib";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/** A small multi-page PDF with a text line per page, for the unit tests. */
export async function makePdf(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pageCount; i++) {
    const page = doc.addPage([300, 400]);
    page.drawText(`Page ${i}`, { x: 40, y: 340, size: 24, font, color: rgb(0, 0, 0) });
  }
  return doc.save();
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const payload = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(payload) >>> 0);
  return Buffer.concat([length, payload, crc]);
}

function crc32(buffer: Buffer): number {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc;
}

/**
 * A real (if tiny) opaque RGB PNG, built by hand so the image tests exercise
 * pdf-lib's actual PNG decoder rather than a stub.
 */
export function makePng(width = 4, height = 4): Uint8Array {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: truecolour
  const raw = Buffer.concat(
    Array.from({ length: height }, () =>
      Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, 0x80)]),
    ),
  );
  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", header),
      chunk("IDAT", deflateSync(raw)),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}

/** A TIFF field: `values` are pairs (numerator, denominator) for rationals. */
interface TiffTag {
  tag: number;
  /** 1 BYTE, 2 ASCII, 3 SHORT, 4 LONG, 5 RATIONAL, 10 SRATIONAL. */
  type: 1 | 2 | 3 | 4 | 5 | 10;
  values: number[] | string;
}

const TIFF_TYPE_SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 4, 10: 4 } as const;

/**
 * A little-endian, single-strip, uncompressed TIFF. Strip offset and byte
 * count are filled in here; everything else is the caller's tags, which is
 * what lets the same writer produce both a scanner TIFF and a DNG.
 */
function makeTiff(tags: TiffTag[], strip: Buffer): Uint8Array {
  const all: TiffTag[] = [
    ...tags,
    { tag: 273, type: 4 as const, values: [0] }, // StripOffsets, patched below
    { tag: 279, type: 4 as const, values: [strip.length] },
  ].sort((a, b) => a.tag - b.tag);

  const ifdSize = 2 + all.length * 12 + 4;
  let overflowAt = 8 + ifdSize;
  const encoded = all.map((field) => {
    const values =
      typeof field.values === "string"
        ? [...Buffer.from(`${field.values}\0`, "latin1")]
        : field.values;
    const unit = TIFF_TYPE_SIZE[field.type];
    const bytes = Buffer.alloc(values.length * unit);
    values.forEach((value, i) => {
      if (unit === 1) bytes.writeUInt8(value, i);
      else if (unit === 2) bytes.writeUInt16LE(value, i * 2);
      else if (field.type === 10) bytes.writeInt32LE(value, i * 4);
      else bytes.writeUInt32LE(value, i * 4);
    });
    const count = field.type === 5 || field.type === 10 ? values.length / 2 : values.length;
    let offset: number | null = null;
    if (bytes.length > 4) {
      offset = overflowAt;
      overflowAt += bytes.length + (bytes.length % 2);
    }
    return { field, count, bytes, offset };
  });

  const stripAt = overflowAt;
  const out = Buffer.alloc(stripAt + strip.length);
  out.write("II", 0, "latin1");
  out.writeUInt16LE(42, 2);
  out.writeUInt32LE(8, 4);
  out.writeUInt16LE(all.length, 8);
  encoded.forEach(({ field, count, bytes, offset }, i) => {
    const at = 10 + i * 12;
    out.writeUInt16LE(field.tag, at);
    out.writeUInt16LE(field.type, at + 2);
    out.writeUInt32LE(count, at + 4);
    if (field.tag === 273) out.writeUInt32LE(stripAt, at + 8);
    else if (offset === null) bytes.copy(out, at + 8);
    else {
      out.writeUInt32LE(offset, at + 8);
      bytes.copy(out, offset);
    }
  });
  strip.copy(out, stripAt);
  return new Uint8Array(out);
}

/**
 * An 8-bit RGB TIFF filled with one colour — what a flatbed scanner writes.
 * Deflate by default, since that is the compression that needs pako behind
 * the decoder and so the one worth exercising.
 */
export function makeTiffImage(
  width: number,
  height: number,
  [r, g, b]: [number, number, number],
  { deflate = true }: { deflate?: boolean } = {},
): Uint8Array {
  const pixels = Buffer.alloc(width * height * 3);
  for (let i = 0; i < width * height; i++) pixels.set([r, g, b], i * 3);
  const strip = deflate ? deflateSync(pixels) : pixels;
  return makeTiff(
    [
      { tag: 256, type: 4, values: [width] },
      { tag: 257, type: 4, values: [height] },
      { tag: 258, type: 3, values: [8, 8, 8] },
      { tag: 259, type: 3, values: [deflate ? 8 : 1] },
      { tag: 262, type: 3, values: [2] },
      { tag: 277, type: 3, values: [3] },
      { tag: 278, type: 4, values: [height] },
      { tag: 284, type: 3, values: [1] },
    ],
    strip,
  );
}

/**
 * A real DNG: a 16-bit RGGB sensor mosaic, red light on the left half and blue
 * on the right, with a colour matrix that makes camera RGB plain linear sRGB.
 * Small enough to build per test, faithful enough that LibRaw runs its whole
 * pipeline — demosaic, white balance, colour conversion, orientation — on it.
 */
export function makeDng(width = 64, height = 48, orientation = 1): Uint8Array {
  const strip = Buffer.alloc(width * height * 2);
  const high = 40000;
  const low = 2000;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // RGGB: red on even/even, blue on odd/odd, green elsewhere.
      const site = y % 2 === 0 ? (x % 2 === 0 ? "r" : "g") : x % 2 === 0 ? "g" : "b";
      const lit = x < width / 2 ? "r" : "b";
      strip.writeUInt16LE(site === lit ? high : low, (y * width + x) * 2);
    }
  }
  // XYZ (D65) → linear sRGB, as SRATIONAL over 10000.
  const xyzToSrgb = [
    32406, -15372, -4986, -9689, 18758, 415, 557, -2040, 10570,
  ].flatMap((value) => [value, 10000]);
  return makeTiff(
    [
      { tag: 254, type: 4, values: [0] },
      { tag: 256, type: 4, values: [width] },
      { tag: 257, type: 4, values: [height] },
      { tag: 258, type: 3, values: [16] },
      { tag: 259, type: 3, values: [1] },
      { tag: 262, type: 3, values: [32803] },
      { tag: 271, type: 2, values: "Papyx" },
      { tag: 272, type: 2, values: "Synthetic" },
      { tag: 274, type: 3, values: [orientation] },
      { tag: 277, type: 3, values: [1] },
      { tag: 278, type: 4, values: [height] },
      { tag: 284, type: 3, values: [1] },
      { tag: 33421, type: 3, values: [2, 2] },
      { tag: 33422, type: 1, values: [0, 1, 1, 2] },
      { tag: 50706, type: 1, values: [1, 4, 0, 0] },
      { tag: 50707, type: 1, values: [1, 1, 0, 0] },
      { tag: 50708, type: 2, values: "Papyx Synthetic" },
      { tag: 50714, type: 4, values: [0] },
      { tag: 50717, type: 4, values: [65535] },
      { tag: 50721, type: 10, values: xyzToSrgb },
      { tag: 50728, type: 5, values: [1, 1, 1, 1, 1, 1] },
      { tag: 50778, type: 3, values: [21] },
    ],
    strip,
  );
}
