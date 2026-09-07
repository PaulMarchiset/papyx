import { describe, expect, it } from "vitest";
import { isHeif } from "@/lib/pdf/heif";
import { outputNames } from "@/lib/pdf/convertImages";
import { makePng } from "@/test/fixtures";

/**
 * An ISO-BMFF header, hand-built so the sniffing tests exercise the real box
 * layout: a big-endian size, the "ftyp" tag, a major brand, a minor version and
 * then as many compatible brands as fit in the declared size.
 */
function ftyp(major: string, compatible: string[] = []): Uint8Array {
  const size = 16 + compatible.length * 4;
  const bytes = new Uint8Array(size + 8);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, size);
  const write = (text: string, at: number) => {
    for (let i = 0; i < 4; i++) bytes[at + i] = text.charCodeAt(i);
  };
  write("ftyp", 4);
  write(major, 8);
  compatible.forEach((brand, index) => write(brand, 16 + index * 4));
  return bytes;
}

describe("isHeif", () => {
  it("accepts an iPhone photo, which declares heic outright", () => {
    expect(isHeif(ftyp("heic", ["mif1", "miaf", "heic"]))).toBe(true);
  });

  it("accepts a generic mif1 file, the brand most encoders write", () => {
    expect(isHeif(ftyp("mif1", ["mif1", "heic"]))).toBe(true);
  });

  it("finds the brand in the compatible list when the major one is unknown", () => {
    expect(isHeif(ftyp("qt  ", ["hevc"]))).toBe(true);
  });

  it("rejects AVIF, which shares the container but decodes natively", () => {
    // The trap: AVIF declares mif1 among its compatible brands, so a naive
    // brand scan would send it down the wasm path and lose its 10-bit range.
    expect(isHeif(ftyp("avif", ["avif", "mif1", "miaf"]))).toBe(false);
    expect(isHeif(ftyp("mif1", ["mif1", "avif"]))).toBe(false);
  });

  it("rejects images that are not ISO-BMFF at all", () => {
    expect(isHeif(makePng())).toBe(false);
  });

  it("rejects a buffer too short to hold a header", () => {
    expect(isHeif(new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]))).toBe(false);
  });

  it("ignores brands past the end of a truncated box", () => {
    const bytes = ftyp("qt  ", ["heic"]).subarray(0, 16);
    expect(isHeif(bytes)).toBe(false);
  });
});

describe("outputNames", () => {
  it("keeps the stem and swaps the extension, spelling jpeg as jpg", () => {
    expect(outputNames(["IMG_0042.heic", "scan.PNG"], "jpeg")).toEqual([
      "IMG_0042.jpg",
      "scan.jpg",
    ]);
  });

  it("suffixes a collision instead of writing the same file twice", () => {
    expect(
      outputNames(["photo.heic", "photo.png", "photo.webp"], "jpeg"),
    ).toEqual(["photo.jpg", "photo-2.jpg", "photo-3.jpg"]);
  });

  it("treats names differing only by case as the same file, like Windows", () => {
    expect(outputNames(["Photo.heic", "photo.webp"], "png")).toEqual([
      "Photo.png",
      "photo-2.png",
    ]);
  });
});
