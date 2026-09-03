import type { ProgressCallback } from "@/lib/pdf/progress";
import { PDFDocument } from "pdf-lib";
import { embedImage } from "@/lib/pdf/images";
import {
  MM_TO_POINTS,
  pageDimensions,
  savePdf,
  type Orientation,
  type PageSizeId,
} from "@/lib/pdf/document";

export interface ImagesToPdfOptions {
  /** "auto" gives every page the exact proportions of its image. */
  pageSize: PageSizeId;
  orientation: Orientation;
  marginMm: number;
}

export const DEFAULT_IMAGES_TO_PDF: ImagesToPdfOptions = {
  pageSize: "a4",
  orientation: "auto",
  marginMm: 0,
};

/**
 * One image per page, in the order given. Images are embedded at their original
 * resolution — the page geometry only decides how they are scaled on paper, so
 * nothing is resampled.
 */
export async function imagesToPdf(
  images: { bytes: Uint8Array }[],
  options: ImagesToPdfOptions,
  onProgress?: ProgressCallback,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const margin = Math.max(0, options.marginMm) * MM_TO_POINTS;

  for (const [index, image] of images.entries()) {
    const embedded = await embedImage(doc, image.bytes);
    const landscape = embedded.width > embedded.height;

    if (options.pageSize === "auto") {
      // The page *is* the image: margins grow the sheet rather than shrinking
      // the picture, which is what "same size as image" should mean.
      const page = doc.addPage([
        embedded.width + margin * 2,
        embedded.height + margin * 2,
      ]);
      page.drawImage(embedded, {
        x: margin,
        y: margin,
        width: embedded.width,
        height: embedded.height,
      });
    } else {
      const orientation =
        options.orientation === "auto"
          ? landscape
            ? "landscape"
            : "portrait"
          : options.orientation;
      const [pageWidth, pageHeight] = pageDimensions(options.pageSize, orientation);
      const page = doc.addPage([pageWidth, pageHeight]);
      const boxWidth = Math.max(1, pageWidth - margin * 2);
      const boxHeight = Math.max(1, pageHeight - margin * 2);
      // Contain, never enlarge past the box; the image stays centred.
      const scale = Math.min(boxWidth / embedded.width, boxHeight / embedded.height);
      const width = embedded.width * scale;
      const height = embedded.height * scale;
      page.drawImage(embedded, {
        x: (pageWidth - width) / 2,
        y: (pageHeight - height) / 2,
        width,
        height,
      });
    }

    await onProgress?.(index + 1, images.length);
  }

  return savePdf(doc);
}
