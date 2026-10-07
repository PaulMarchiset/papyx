import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { openDocument, renderPage, type LoadedDocument } from "@/lib/pdf/pdfjs";
import { imageThumbnail, needsDecoder } from "@/lib/pdf/images";
import { BTN_ICON } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import type { SourceFile } from "@/lib/types";

/**
 * A larger look at a file or a page. Thumbnails answer "is this the right
 * document?"; this answers "is that the right page, and is it the right way
 * up?" — which a 120px tile cannot.
 *
 * One viewer for the whole app, opened from anywhere through `usePreview`: the
 * file list, the page picker, the Organize grid. A PDF can be paged through
 * with the arrows (buttons or keyboard); `rotation` shows a page as a tool is
 * about to turn it, so the preview agrees with the thumbnail it came from.
 */

interface PreviewRequest {
  file: SourceFile;
  /** 1-based; PDFs only. */
  page?: number;
  /** Clockwise degrees, per page, applied on screen only. */
  rotationFor?: (page: number) => number;
}

const PreviewContext = createContext<(request: PreviewRequest) => void>(() => {});

/** Opens the viewer. Locked PDFs cannot be rendered and are ignored. */
export function usePreview() {
  return useContext(PreviewContext);
}

export function PreviewProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<PreviewRequest | null>(null);
  const open = useCallback((next: PreviewRequest) => {
    if (next.file.locked) return;
    setRequest(next);
  }, []);

  return (
    <PreviewContext.Provider value={open}>
      {children}
      {request && <Viewer request={request} onClose={() => setRequest(null)} />}
    </PreviewContext.Provider>
  );
}

/**
 * The corner button that opens the viewer from a thumbnail whose own click
 * already means something (selecting a page). It is a sibling laid over the
 * tile rather than a child of it — a button inside a button is not HTML.
 * Shown on hover, and to the keyboard on focus.
 */
export function ZoomButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        "absolute top-2.5 right-2.5 z-10 rounded-md bg-surface/95 p-1.5 text-fg shadow-card",
        "opacity-0 group-hover/tile:opacity-100 focus-visible:opacity-100 hover:bg-surface",
        "transition-opacity cursor-zoom-in",
      )}
    >
      <Maximize2 className="w-3.5 h-3.5" />
    </button>
  );
}

function Viewer({ request, onClose }: { request: PreviewRequest; onClose: () => void }) {
  const { t } = useTranslation();
  const { file } = request;
  const isPdf = file.kind === "pdf";
  const total = isPdf ? (file.pageCount ?? 1) : 1;
  const [page, setPage] = useState(request.page ?? 1);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState<LoadedDocument | null>(null);

  // The document stays open while the viewer is, so paging is a render and
  // not a re-parse.
  useEffect(() => {
    if (!isPdf) return;
    let alive = true;
    let handle: LoadedDocument | null = null;
    openDocument(file.bytes)
      .then((opened) => {
        handle = opened;
        if (alive) setLoaded(opened);
        else void opened.close();
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      void handle?.close();
    };
  }, [file, isPdf]);

  useEffect(() => {
    let alive = true;
    let blob: string | null = null;
    setFailed(false);

    (async () => {
      const ratio = window.devicePixelRatio || 1;
      const maxWidth = window.innerWidth * 0.86 * ratio;
      const maxHeight = window.innerHeight * 0.8 * ratio;
      if (isPdf) {
        if (!loaded) return;
        const proxy = await loaded.doc.getPage(page);
        const base = proxy.getViewport({ scale: 1 });
        proxy.cleanup();
        const scale = Math.min(maxWidth / base.width, maxHeight / base.height, 4);
        const canvas = await renderPage(loaded.doc, page, scale);
        if (alive) setUrl(canvas.toDataURL("image/jpeg", 0.92));
      } else if (needsDecoder(file.bytes)) {
        const decoded = await imageThumbnail(file.bytes, Math.max(maxWidth, maxHeight));
        if (alive) setUrl(decoded);
      } else {
        blob = URL.createObjectURL(new Blob([file.bytes as BlobPart]));
        if (alive) setUrl(blob);
      }
    })().catch(() => alive && setFailed(true));

    return () => {
      alive = false;
      if (blob) URL.revokeObjectURL(blob);
    };
  }, [file, isPdf, loaded, page]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") setPage((current) => Math.max(1, current - 1));
      if (event.key === "ArrowRight") setPage((current) => Math.min(total, current + 1));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, total]);

  const rotation = request.rotationFor?.(page) ?? 0;
  const sideways = Math.abs(rotation % 180) === 90;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("preview.title", { name: file.name })}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/75 px-6 py-6"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t("common.close")}
        className={cn(BTN_ICON, "absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/10")}
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex-1 min-h-0 w-full flex items-center justify-center">
        {url ? (
          <img
            src={url}
            alt=""
            onClick={(event) => event.stopPropagation()}
            className="object-contain rounded-md bg-paper shadow-pop transition-transform"
            // Turned a quarter, the image's width is what shows as its height,
            // so the two limits trade places.
            style={{
              maxWidth: sideways ? "80vh" : "86vw",
              maxHeight: sideways ? "86vw" : "80vh",
              transform: rotation ? `rotate(${rotation}deg)` : undefined,
            }}
          />
        ) : failed ? (
          <p className="text-sm text-white/80">{t("errors.decode", { name: file.name })}</p>
        ) : (
          <span className="w-8 h-8 rounded-full border-2 border-white/25 border-t-white animate-spin" />
        )}
      </div>

      <div
        className="flex items-center gap-3 text-sm text-white/85"
        onClick={(event) => event.stopPropagation()}
      >
        {total > 1 && (
          <button
            type="button"
            aria-label={t("preview.previous")}
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className={cn(BTN_ICON, "text-white/80 hover:text-white hover:bg-white/10")}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <span className="max-w-[50vw] truncate">{file.name}</span>
        {total > 1 && (
          <span className="tabular-nums text-white/60">
            {t("preview.page", { page, total })}
          </span>
        )}
        {total > 1 && (
          <button
            type="button"
            aria-label={t("preview.next")}
            disabled={page >= total}
            onClick={() => setPage(page + 1)}
            className={cn(BTN_ICON, "text-white/80 hover:text-white hover:bg-white/10")}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
