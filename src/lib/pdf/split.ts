import type { ProgressCallback } from "@/lib/pdf/progress";
import { PDFDocument } from "pdf-lib";
import { loadPdf, savePdf } from "@/lib/pdf/document";
import { chunkPages, formatPageRanges } from "@/lib/pageRanges";
import type { OutputFile } from "@/lib/types";
import { stem } from "@/lib/format";

export type SplitMode =
  /** One output per explicit group of pages, e.g. "1-3" and "7-9". */
  | { kind: "ranges"; groups: number[][] }
  /** One output every `size` pages. */
  | { kind: "every"; size: number }
  /** One output per page. */
  | { kind: "each" }
  /** A single output holding just the selected pages. */
  | { kind: "extract"; pages: number[] };

/** Builds a new document out of `pages` (1-based) of `source`. */
async function subsetOf(source: PDFDocument, pages: number[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  const copied = await out.copyPages(source, pages.map((n) => n - 1));
  for (const page of copied) out.addPage(page);
  return savePdf(out);
}

export async function splitPdf(
  file: { name: string; bytes: Uint8Array },
  mode: SplitMode,
  onProgress?: ProgressCallback,
): Promise<OutputFile[]> {
  const source = await loadPdf(file.bytes);
  const pageCount = source.getPageCount();
  const base = stem(file.name);

  const groups: number[][] =
    mode.kind === "ranges"
      ? mode.groups
      : mode.kind === "every"
        ? chunkPages(pageCount, Math.max(1, mode.size))
        : mode.kind === "each"
          ? chunkPages(pageCount, 1)
          : [mode.pages];

  const outputs: OutputFile[] = [];
  for (const [index, pages] of groups.entries()) {
    if (pages.length === 0) continue;
    const bytes = await subsetOf(source, pages);
    // Naming the file after its pages ("rapport_4-6.pdf") is friendlier than a
    // running index once a dozen of them land in the same folder.
    const suffix = formatPageRanges(pages).replace(/,\s*/g, "_") || `${index + 1}`;
    outputs.push({
      name: `${base}_${suffix}.pdf`,
      bytes,
      mime: "application/pdf",
    });
    await onProgress?.(index + 1, groups.length);
  }
  return outputs;
}
