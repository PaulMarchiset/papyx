import { loadPdf, savePdf } from "@/lib/pdf/document";

export interface PdfMetadata {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
  creationDate: string | null;
  modificationDate: string | null;
}

export const EMPTY_METADATA: PdfMetadata = {
  title: "",
  author: "",
  subject: "",
  keywords: "",
  creator: "",
  producer: "",
  creationDate: null,
  modificationDate: null,
};

export async function readMetadata(file: { bytes: Uint8Array }): Promise<PdfMetadata> {
  const doc = await loadPdf(file.bytes);
  const iso = (d: Date | undefined) => (d ? d.toISOString() : null);
  return {
    title: doc.getTitle() ?? "",
    author: doc.getAuthor() ?? "",
    subject: doc.getSubject() ?? "",
    keywords: (doc.getKeywords() ?? "").toString(),
    creator: doc.getCreator() ?? "",
    producer: doc.getProducer() ?? "",
    creationDate: iso(doc.getCreationDate()),
    modificationDate: iso(doc.getModificationDate()),
  };
}

/**
 * Writes the document information dictionary. Empty strings are written as
 * empty rather than skipped, which is how a field gets cleared — that is the
 * point of the tool for anyone stripping their name off a document.
 */
export async function writeMetadata(
  file: { bytes: Uint8Array },
  metadata: PdfMetadata,
): Promise<Uint8Array> {
  const doc = await loadPdf(file.bytes);
  doc.setTitle(metadata.title);
  doc.setAuthor(metadata.author);
  doc.setSubject(metadata.subject);
  doc.setKeywords(metadata.keywords.split(/\s*[,;]\s*/).filter(Boolean));
  doc.setCreator(metadata.creator);
  doc.setProducer(metadata.producer);
  doc.setModificationDate(new Date());
  return savePdf(doc);
}
