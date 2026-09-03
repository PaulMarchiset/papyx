import type { ProgressCallback } from "@/lib/pdf/progress";
import { PDFDocument } from "pdf-lib";
import { loadPdf, normalizeRotation, savePdf } from "@/lib/pdf/document";

export interface PagePlan {
  /** 1-based page number in the source document. */
  page: number;
  /** Extra rotation in degrees, added to whatever the page already carries. */
  rotation: number;
}

/**
 * Rebuilds a document from an explicit page plan — the single primitive behind
 * reorder, delete, duplicate and rotate. Dropping a page is simply leaving it
 * out of the plan; duplicating it is listing it twice.
 */
export async function organizePdf(
  file: { bytes: Uint8Array },
  plan: PagePlan[],
  onProgress?: ProgressCallback,
): Promise<Uint8Array> {
  const source = await loadPdf(file.bytes);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(
    source,
    plan.map((item) => item.page - 1),
  );

  for (const [index, page] of copied.entries()) {
    const added = out.addPage(page);
    const extra = plan[index].rotation;
    if (extra % 360 !== 0) {
      added.setRotation(normalizeRotation(added.getRotation().angle + extra));
    }
    await onProgress?.(index + 1, copied.length);
  }

  return savePdf(out);
}
