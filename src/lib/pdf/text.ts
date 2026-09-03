import type { ProgressCallback } from "@/lib/pdf/progress";
import { openDocument } from "@/lib/pdf/pdfjs";

export interface ExtractTextOptions {
  /** 1-based; empty means every page. */
  pages: number[];
  /** Prefix each page's text with "--- Page N ---". */
  pageMarkers: boolean;
  password?: string;
}

export const DEFAULT_EXTRACT_TEXT: ExtractTextOptions = {
  pages: [],
  pageMarkers: true,
};

/**
 * Pulls the text layer out of a PDF. pdf.js gives back positioned runs rather
 * than lines, but it flags the ones that ended a line (`hasEOL`), which is
 * enough to rebuild readable paragraphs without guessing from coordinates.
 *
 * A scanned document has no text layer and will come back empty — that is the
 * document's doing, not a failure, and the UI says as much when it happens.
 */
export async function extractText(
  file: { bytes: Uint8Array },
  options: ExtractTextOptions,
  onProgress?: ProgressCallback,
): Promise<string> {
  const { doc, close } = await openDocument(file.bytes, options.password);
  try {
    // A locked file has no known page count until pdf.js opens it, so the
    // selection is only bounded here.
    const pages =
      options.pages.length > 0
        ? options.pages.filter((n) => n >= 1 && n <= doc.numPages)
        : Array.from({ length: doc.numPages }, (_, i) => i + 1);
    const chunks: string[] = [];

    for (const [index, pageNumber] of pages.entries()) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      let text = "";
      for (const item of content.items) {
        if (!("str" in item)) continue;
        text += item.str;
        if (item.hasEOL) text += "\n";
      }
      page.cleanup();
      chunks.push(
        options.pageMarkers ? `--- Page ${pageNumber} ---\n${text.trim()}` : text.trim(),
      );
      await onProgress?.(index + 1, pages.length);
    }

    return chunks.join("\n\n");
  } finally {
    await close();
  }
}
