/**
 * Page-range expressions ("1-3, 5, 9-") as typed by the user, resolved against
 * a known page count. Everything the UI shows is 1-based; the PDF layer works
 * on 0-based indices, so {@link parsePageRanges} returns 1-based numbers and
 * callers subtract one when they hand them to pdf-lib.
 */

export interface ParsedRanges {
  /** 1-based page numbers, in the order written, without duplicates. */
  pages: number[];
  /** Null when the expression is valid; otherwise a user-facing reason key. */
  error: string | null;
}

/**
 * Grammar: comma- or space-separated items, each `N`, `N-M`, `N-` (to the end)
 * or `-M` (from page 1). `M < N` is accepted and read backwards, which is how
 * you reverse a selection.
 */
export function parsePageRanges(expr: string, pageCount: number): ParsedRanges {
  const trimmed = expr.trim();
  if (trimmed === "") return { pages: [], error: "empty" };

  const seen = new Set<number>();
  const pages: number[] = [];
  const push = (n: number) => {
    if (n < 1 || n > pageCount) throw new RangeError("out-of-bounds");
    if (!seen.has(n)) {
      seen.add(n);
      pages.push(n);
    }
  };

  try {
    for (const rawItem of trimmed.split(/[,\s]+/)) {
      if (rawItem === "") continue;
      const m = /^(\d*)(?:-(\d*))?$/.exec(rawItem);
      if (!m) throw new SyntaxError("syntax");

      const hasDash = rawItem.includes("-");
      const from = m[1] === "" ? (hasDash ? 1 : NaN) : Number(m[1]);
      if (!hasDash) {
        if (!Number.isFinite(from)) throw new SyntaxError("syntax");
        push(from);
        continue;
      }
      const to = m[2] === "" || m[2] === undefined ? pageCount : Number(m[2]);
      if (!Number.isFinite(from) || !Number.isFinite(to)) throw new SyntaxError("syntax");
      const step = to >= from ? 1 : -1;
      for (let n = from; step > 0 ? n <= to : n >= to; n += step) push(n);
    }
  } catch (e) {
    return { pages: [], error: e instanceof RangeError ? "out-of-bounds" : "syntax" };
  }

  return pages.length === 0 ? { pages: [], error: "empty" } : { pages, error: null };
}

/** Inverse of {@link parsePageRanges}: [1,2,3,7,9,10] → "1-3, 7, 9-10". */
export function formatPageRanges(pages: number[]): string {
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  const parts: string[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    parts.push(i === j ? `${sorted[i]}` : `${sorted[i]}-${sorted[j]}`);
    i = j + 1;
  }
  return parts.join(", ");
}

/** Splits [1..pageCount] into consecutive chunks of `size` pages. */
export function chunkPages(pageCount: number, size: number): number[][] {
  const chunks: number[][] = [];
  for (let start = 1; start <= pageCount; start += size) {
    const chunk: number[] = [];
    for (let n = start; n < start + size && n <= pageCount; n++) chunk.push(n);
    chunks.push(chunk);
  }
  return chunks;
}
