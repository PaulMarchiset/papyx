import { describe, expect, it } from "vitest";
import { chunkPages, formatPageRanges, parsePageRanges } from "@/lib/pageRanges";

describe("parsePageRanges", () => {
  it("reads single pages, ranges and mixed lists", () => {
    expect(parsePageRanges("1, 3-5, 8", 10).pages).toEqual([1, 3, 4, 5, 8]);
    expect(parsePageRanges("2 4", 10).pages).toEqual([2, 4]);
  });

  it("treats an open end as 'to the last page' and an open start as 'from 1'", () => {
    expect(parsePageRanges("8-", 10).pages).toEqual([8, 9, 10]);
    expect(parsePageRanges("-3", 10).pages).toEqual([1, 2, 3]);
  });

  it("reads a descending range backwards (that is how you reverse pages)", () => {
    expect(parsePageRanges("5-1", 10).pages).toEqual([5, 4, 3, 2, 1]);
  });

  it("keeps the written order and drops duplicates", () => {
    expect(parsePageRanges("3,1,3,2", 5).pages).toEqual([3, 1, 2]);
  });

  it("rejects out-of-bounds pages and malformed input", () => {
    expect(parsePageRanges("11", 10).error).toBe("out-of-bounds");
    expect(parsePageRanges("0", 10).error).toBe("out-of-bounds");
    expect(parsePageRanges("a-b", 10).error).toBe("syntax");
    expect(parsePageRanges("  ", 10).error).toBe("empty");
  });
});

describe("formatPageRanges", () => {
  it("collapses consecutive runs", () => {
    expect(formatPageRanges([1, 2, 3, 7, 9, 10])).toBe("1-3, 7, 9-10");
    expect(formatPageRanges([])).toBe("");
  });
});

describe("chunkPages", () => {
  it("splits into fixed-size chunks with a short tail", () => {
    expect(chunkPages(5, 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});
