import { describe, expect, it } from "vitest";
import { reorder } from "@/lib/reorder";

describe("reorder", () => {
  const list = ["a", "b", "c", "d"];

  it("moves an item forward, accounting for the gap it leaves behind", () => {
    expect(reorder(list, 0, 2)).toEqual(["b", "c", "a", "d"]);
  });

  it("moves an item backward", () => {
    expect(reorder(list, 3, 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("clamps a drop past the end and leaves the list alone otherwise", () => {
    expect(reorder(list, 0, 99)).toEqual(["b", "c", "d", "a"]);
    expect(reorder(list, 2, 2)).toBe(list);
    expect(reorder(list, 9, 0)).toBe(list);
  });
});
