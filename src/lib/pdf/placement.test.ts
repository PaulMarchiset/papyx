import { describe, expect, it } from "vitest";
import { displayedSize, normalizeAngle, screenToPdf } from "@/lib/pdf/placement";

describe("displayedSize", () => {
  it("swaps the dimensions on a quarter turn only", () => {
    expect(displayedSize(400, 600, 0)).toEqual({ width: 400, height: 600 });
    expect(displayedSize(400, 600, 90)).toEqual({ width: 600, height: 400 });
    expect(displayedSize(400, 600, 180)).toEqual({ width: 400, height: 600 });
    expect(displayedSize(400, 600, 270)).toEqual({ width: 600, height: 400 });
  });
});

describe("screenToPdf", () => {
  const width = 400;
  const height = 600;

  it("is the identity on an unrotated page", () => {
    expect(screenToPdf({ x: 10, y: 20 }, width, height, 0)).toEqual({ x: 10, y: 20 });
  });

  it("maps the four corners of a quarter-turned page back inside it", () => {
    // Displayed size is 600x400; its bottom-left is the page's top-left.
    expect(screenToPdf({ x: 0, y: 0 }, width, height, 90)).toEqual({ x: 400, y: 0 });
    expect(screenToPdf({ x: 600, y: 400 }, width, height, 90)).toEqual({ x: 0, y: 600 });
    expect(screenToPdf({ x: 0, y: 0 }, width, height, 270)).toEqual({ x: 0, y: 600 });
    expect(screenToPdf({ x: 600, y: 400 }, width, height, 270)).toEqual({ x: 400, y: 0 });
  });

  it("mirrors both axes on a half turn", () => {
    expect(screenToPdf({ x: 10, y: 20 }, width, height, 180)).toEqual({ x: 390, y: 580 });
  });
});

describe("normalizeAngle", () => {
  it("snaps to the four quarter turns", () => {
    expect(normalizeAngle(-90)).toBe(270);
    expect(normalizeAngle(450)).toBe(90);
    expect(normalizeAngle(0)).toBe(0);
  });
});
