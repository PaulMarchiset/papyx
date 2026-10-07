import { describe, expect, it } from "vitest";
import { makeDng, makePng, makeTiffImage } from "@/test/fixtures";
import { isRaw } from "@/lib/pdf/raw";
import { isTiff } from "@/lib/pdf/tiff";
import { needsDecoder } from "@/lib/pdf/images";

/** A file header: `head` written out byte by byte, then zero padding. */
function header(...head: (string | number)[]): Uint8Array {
  const bytes = new Uint8Array(32);
  let at = 0;
  for (const part of head) {
    if (typeof part === "number") bytes[at++] = part;
    else for (const char of part) bytes[at++] = char.charCodeAt(0);
  }
  return bytes;
}

describe("isRaw", () => {
  it("recognises a DNG by the version tag in its first directory", () => {
    expect(isRaw(makeDng())).toBe(true);
  });

  it("leaves a scanner's TIFF to the TIFF decoder", () => {
    // Both are TIFF files; this is the distinction that matters.
    const scan = makeTiffImage(8, 8, [255, 255, 255]);
    expect(isTiff(scan)).toBe(true);
    expect(isRaw(scan)).toBe(false);
  });

  it("recognises the formats that rename the TIFF magic or skip it", () => {
    expect(isRaw(header("IIRO", 8, 0, 0, 0))).toBe(true); // ORF
    expect(isRaw(header("IIU", 0, 8, 0, 0, 0))).toBe(true); // RW2
    expect(isRaw(header("II*", 0, 16, 0, 0, 0, "CR", 2, 0))).toBe(true); // CR2
    expect(isRaw(header("FUJIFILMCCD-RAW 0201"))).toBe(true); // RAF
    expect(isRaw(header(0, 0, 0, 24, "ftypcrx "))).toBe(true); // CR3
  });

  it("says no to everything else", () => {
    expect(isRaw(makePng())).toBe(false);
    expect(isRaw(header(0, 0, 0, 24, "ftypheic"))).toBe(false);
    expect(isRaw(new Uint8Array(4))).toBe(false);
  });
});

describe("needsDecoder", () => {
  it("routes TIFF and RAW away from <img>, which cannot show them", () => {
    expect(needsDecoder(makeDng())).toBe(true);
    expect(needsDecoder(makeTiffImage(4, 4, [0, 0, 0]))).toBe(true);
    expect(needsDecoder(makePng())).toBe(false);
  });
});
