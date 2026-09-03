import { useEffect, useState } from "react";
import { openDocument, renderThumbnail } from "@/lib/pdf/pdfjs";
import type { SourceFile } from "@/lib/types";

/**
 * Renders every page of `file` to a data URL for the page grid.
 *
 * Thumbnails are component state rather than tool options: they are derived
 * from the file, cost little to rebuild, and would otherwise push megabytes of
 * base64 through the options object on every keystroke elsewhere in the panel.
 */
export function useThumbnails(file: SourceFile | undefined, width = 160) {
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!file || file.locked) {
      setUrls([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setUrls([]);

    (async () => {
      const { doc, close } = await openDocument(file.bytes);
      try {
        for (let page = 1; page <= doc.numPages; page++) {
          const url = await renderThumbnail(doc, page, width);
          if (cancelled) return;
          // Appending page by page lets the grid fill in progressively instead
          // of staying blank until the last page is rendered.
          setUrls((current) => [...current, url]);
        }
      } finally {
        await close();
        if (!cancelled) setLoading(false);
      }
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [file, width]);

  return { urls, loading };
}
