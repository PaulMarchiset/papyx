import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Collapse } from "@/components/ui/Collapse";
import { Segmented } from "@/components/ui/Segmented";
import { formatPageRanges, parsePageRanges } from "@/lib/pageRanges";
import { useThumbnails } from "@/lib/useThumbnails";
import { cn } from "@/lib/cn";
import type { SourceFile } from "@/lib/types";

interface Props {
  label: string;
  /** Page-range expression; "" means every page where `allowAll` is set. */
  value: string;
  onChange: (value: string) => void;
  /** The document the thumbnails come from — the first one, for a batch. */
  file: SourceFile | undefined;
  pageCount: number;
  /** False where "every page" is not one of the answers (splitting). */
  allowAll?: boolean;
}

/**
 * Choosing pages by clicking them.
 *
 * The value is still a range expression underneath — that is what the PDF layer
 * takes, and what "1-3, 7" says compactly — but nobody has to type it: the
 * pages are on screen, you click the ones you want, shift-click runs, and the
 * shortcuts cover the odd/even cases. An expression can no longer be malformed
 * or point outside the document, which removes those two errors entirely.
 *
 * Past a certain length the previews stop being worth their render time and the
 * grid falls back to numbered tiles — still clickable, just not illustrated.
 */
const THUMBNAIL_LIMIT = 80;

export function PageSelector({
  label,
  value,
  onChange,
  file,
  pageCount,
  allowAll = true,
}: Props) {
  const { t } = useTranslation();
  const all = allowAll && value.trim() === "";
  const withThumbnails = !all && pageCount > 0 && pageCount <= THUMBNAIL_LIMIT;
  const { urls } = useThumbnails(withThumbnails ? file : undefined, 120);
  // Anchor for shift-click, so a run can be selected without dragging.
  const lastClicked = useRef<number | null>(null);

  const selected = useMemo(
    () => new Set(all ? [] : parsePageRanges(value, Math.max(1, pageCount)).pages),
    [value, pageCount, all],
  );

  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);
  const apply = (next: Iterable<number>) => onChange(formatPageRanges([...next]));

  const click = (page: number, shift: boolean) => {
    const next = new Set(selected);
    if (shift && lastClicked.current != null) {
      const [from, to] = [lastClicked.current, page].sort((a, b) => a - b);
      // A shift-click extends the selection rather than replacing it, which is
      // what makes "1-3 and 7-9" two gestures instead of six clicks.
      for (let n = from; n <= to; n++) next.add(n);
    } else if (next.has(page)) {
      next.delete(page);
    } else {
      next.add(page);
    }
    lastClicked.current = page;
    apply(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-medium text-fg">{label}</span>
        {allowAll && (
          <Segmented<"all" | "some">
            value={all ? "all" : "some"}
            segments={[
              { value: "all", label: t("pages.all") },
              { value: "some", label: t("pages.some") },
            ]}
            onChange={(mode) => onChange(mode === "all" ? "" : formatPageRanges(pages))}
          />
        )}
      </div>

      {/* Switching between "every page" and a selection moves a whole grid in
          and out of the layout; growing it is the difference between the rest
          of the panel travelling and it teleporting. */}
      <Collapse open={!all}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Shortcut onClick={() => apply(pages)}>{t("pages.selectAll")}</Shortcut>
            <Shortcut onClick={() => apply([])}>{t("pages.selectNone")}</Shortcut>
            <Shortcut onClick={() => apply(pages.filter((page) => page % 2 === 1))}>
              {t("pages.odd")}
            </Shortcut>
            <Shortcut onClick={() => apply(pages.filter((page) => page % 2 === 0))}>
              {t("pages.even")}
            </Shortcut>
            <Shortcut
              onClick={() => apply(pages.filter((page) => !selected.has(page)))}
            >
              {t("pages.invert")}
            </Shortcut>
          </div>

          <div
            className={cn(
              "grid gap-2",
              withThumbnails
                ? "grid-cols-[repeat(auto-fill,minmax(84px,1fr))]"
                : "grid-cols-[repeat(auto-fill,minmax(52px,1fr))]",
            )}
          >
            {pages.map((page) => (
              <button
                key={page}
                type="button"
                aria-label={`Page ${page}`}
                aria-pressed={selected.has(page)}
                onClick={(event) => click(page, event.shiftKey)}
                className={cn(
                  "rounded-lg border transition-colors",
                  withThumbnails ? "p-1.5" : "px-2 py-2.5",
                  selected.has(page)
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-border-hover",
                )}
              >
                {withThumbnails && (
                  <div className="aspect-[1/1.414] rounded bg-paper overflow-hidden flex items-center justify-center">
                    {urls[page - 1] ? (
                      <img
                        src={urls[page - 1]}
                        alt=""
                        draggable={false}
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <span className="w-4 h-4 rounded-full border-2 border-border-strong border-t-accent animate-spin" />
                    )}
                  </div>
                )}
                <div
                  className={cn(
                    "text-center text-xs tabular-nums",
                    withThumbnails && "mt-1",
                    selected.has(page) ? "text-fg" : "text-muted",
                  )}
                >
                  {page}
                </div>
              </button>
            ))}
          </div>

          <p className="text-xs text-muted">
            {t("pages.selected", { count: selected.size })}
            {selected.size > 0 && (
              <span className="font-mono"> · {formatPageRanges([...selected])}</span>
            )}
            <span className="ml-2 opacity-70">{t("pages.shiftHint")}</span>
          </p>
        </div>
      </Collapse>
    </div>
  );
}

function Shortcut({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2.5 py-1.5 rounded-md border border-border text-xs text-subtle hover:text-fg hover:border-border-hover transition-colors"
    >
      {children}
    </button>
  );
}
