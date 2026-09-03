import type { ProgressCallback } from "@/lib/pdf/progress";
import { PDFDocument } from "pdf-lib";
import { loadPdf, savePdf } from "@/lib/pdf/document";

/**
 * Concatenates documents in the order given. `copyPages` carries each page's
 * resources across, so fonts, images and annotations survive and the pages keep
 * their individual sizes and rotations.
 */
export async function mergePdfs(
  files: { bytes: Uint8Array }[],
  onProgress?: ProgressCallback,
): Promise<Uint8Array> {
  const out = await PDFDocument.create();

  for (const [index, file] of files.entries()) {
    const source = await loadPdf(file.bytes);
    const pages = await out.copyPages(source, source.getPageIndices());
    for (const page of pages) out.addPage(page);
    await onProgress?.(index + 1, files.length);
  }

  return savePdf(out);
}
