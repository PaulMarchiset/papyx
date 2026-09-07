import { useEffect, useRef, useState } from "react";
import { openDocument, renderThumbnail } from "@/lib/pdf/pdfjs";
import { imageThumbnail } from "@/lib/pdf/images";
import { isHeif } from "@/lib/pdf/heif";
import type { SourceFile } from "@/lib/types";

/**
 * First-page previews for the file tray, keyed by file id.
 *
 * A name and a size do not tell you whether you grabbed the right invoice; a
 * thumbnail does, at a glance. Results are cached for the life of the session
 * and rendered one file at a time, so adding a tenth document does not re-render
 * the nine already there.
 *
 * `cancelled` stops the loop from picking up the *next* file, but a preview that
 * is already decoded still gets published: its id was claimed in `seen` the
 * moment the work started, so a later pass would skip it and the preview would
 * be lost for good. That is not hypothetical — StrictMode runs every effect
 * twice, which cancelled the first pass and made the second skip everything.
 *
 * Images are shown from a blob URL instead — decoding them through pdf.js would
 * be silly, and the browser already knows how. Except for HEIC, which it does
 * not: those are decoded and re-encoded down to thumbnail size (see heif.ts).
 */
export function useFileThumbnails(files: SourceFile[]): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});
  // Ids already rendered or in flight, so the effect never redoes work.
  const seen = useRef(new Set<string>());
  // Blob URLs handed to <img>; revoked when the hook goes away.
  const blobs = useRef<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      for (const file of files) {
        if (cancelled || seen.current.has(file.id)) continue;
        seen.current.add(file.id);

        if (file.kind === "image") {
          if (isHeif(file.bytes)) {
            try {
              const url = await imageThumbnail(file.bytes, 96);
              setUrls((current) => ({ ...current, [file.id]: url }));
            } catch {
              // A preview is a nicety; the file still converts.
            }
            continue;
          }
          const url = URL.createObjectURL(new Blob([file.bytes as BlobPart]));
          blobs.current.push(url);
          setUrls((current) => ({ ...current, [file.id]: url }));
          continue;
        }
        if (file.locked) continue;

        try {
          const { doc, close } = await openDocument(file.bytes);
          try {
            const url = await renderThumbnail(doc, 1, 96);
            setUrls((current) => ({ ...current, [file.id]: url }));
          } finally {
            await close();
          }
        } catch {
          // A preview is a nicety; a document we cannot render still works.
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [files]);

  useEffect(() => {
    const created = blobs.current;
    return () => {
      for (const url of created) URL.revokeObjectURL(url);
    };
  }, []);

  return urls;
}
