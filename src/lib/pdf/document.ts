import { PDFDocument, degrees } from "pdf-lib";

/**
 * pdf-lib side of the house: everything that edits a document's *structure*
 * (pages, order, rotation, metadata) without re-rendering it, so text stays
 * text and the file stays vector. Rendering-based work goes through pdfjs.ts.
 */

/** Page sizes in PDF points (1/72 inch), portrait. */
export const PAGE_SIZES = {
  a4: [595.28, 841.89],
  a3: [841.89, 1190.55],
  a5: [419.53, 595.28],
  letter: [612, 792],
  legal: [612, 1008],
} as const;

export type PageSizeId = keyof typeof PAGE_SIZES | "auto";
export type Orientation = "auto" | "portrait" | "landscape";

export function pageDimensions(
  size: Exclude<PageSizeId, "auto">,
  orientation: Exclude<Orientation, "auto">,
): [number, number] {
  const [w, h] = PAGE_SIZES[size];
  return orientation === "landscape" ? [h, w] : [w, h];
}

export const MM_TO_POINTS = 72 / 25.4;

/**
 * Loads a document for structural editing. `updateMetadata: false` keeps the
 * original producer/creation date instead of stamping pdf-lib over them; the
 * metadata tool is the only place that should rewrite those.
 */
export async function loadPdf(bytes: Uint8Array): Promise<PDFDocument> {
  return PDFDocument.load(bytes, { updateMetadata: false });
}

export async function savePdf(doc: PDFDocument): Promise<Uint8Array> {
  return doc.save({ useObjectStreams: true });
}

/**
 * True when the file is encrypted. pdf-lib cannot decrypt content streams, so
 * the structural tools refuse these up front rather than emitting a file full
 * of garbage; the render-based tools ask for the password and go via pdf.js.
 */
export async function isEncrypted(bytes: Uint8Array): Promise<boolean> {
  try {
    await PDFDocument.load(bytes, { updateMetadata: false });
    return false;
  } catch (e) {
    return e instanceof Error && /encrypted/i.test(e.message);
  }
}

/** Page count without holding on to the document. */
export async function readPageCount(bytes: Uint8Array): Promise<number> {
  const doc = await loadPdf(bytes);
  return doc.getPageCount();
}

/** Normalizes a rotation to the 0/90/180/270 pdf-lib accepts. */
export function normalizeRotation(deg: number) {
  return degrees(((deg % 360) + 360) % 360);
}
