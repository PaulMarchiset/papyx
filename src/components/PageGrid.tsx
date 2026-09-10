import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";

export interface PageItem {
  page: number;
  rotation: number;
  deleted: boolean;
}

interface Props {
  items: PageItem[];
  urls: string[];
  loading: boolean;
  selected: Set<number>;
  onToggle: (page: number) => void;
  /** Drag-and-drop reordering: move the card at `from` to `to`. */
  onReorder: (from: number, to: number) => void;
}

/**
 * The page thumbnails behind the Organize tool. Cards show the page as it will
 * come out — the accumulated rotation is applied to the preview — and a deleted
 * page stays visible but dimmed, so removing one is undoable by eye. Cards are
 * dragged to reorder; the number on a card is its page in the *source*
 * document, which is what makes a rearrangement readable.
 */
export function PageGrid({ items, urls, loading, selected, onToggle, onReorder }: Props) {
  const { t } = useTranslation();
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  // Index the card would land at, i.e. "insert before this card".
  const [dropAt, setDropAt] = useState<number | null>(null);

  const finishDrag = () => {
    if (dragFrom != null && dropAt != null) {
      // Dropping just after itself is a no-op, not a move by one.
      onReorder(dragFrom, dropAt > dragFrom ? dropAt - 1 : dropAt);
    }
    setDragFrom(null);
    setDropAt(null);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
        {items.map((item, index) => (
          <div
            key={item.page}
            draggable
            onDragStart={() => setDragFrom(index)}
            onDragEnd={finishDrag}
            onDragOver={(event) => {
              if (dragFrom == null) return;
              event.preventDefault();
              // Which half of the card the pointer is over decides whether the
              // insertion line sits before or after it.
              const box = event.currentTarget.getBoundingClientRect();
              setDropAt(event.clientX < box.left + box.width / 2 ? index : index + 1);
            }}
            onDrop={(event) => {
              event.preventDefault();
              finishDrag();
            }}
            className={cn("relative", dragFrom === index && "opacity-40")}
          >
            {dropAt === index && <Insertion />}
            {dropAt === items.length && index === items.length - 1 && <Insertion after />}

            <button
              type="button"
              onClick={() => onToggle(item.page)}
              aria-pressed={selected.has(item.page)}
              className={cn(
                "w-full rounded-2xl border p-2 text-left transition-colors cursor-grab active:cursor-grabbing",
                selected.has(item.page)
                  ? "border-accent bg-accent/5"
                  : "border-border hover:border-border-hover",
                item.deleted && "opacity-40",
              )}
            >
              <div className="aspect-[1/1.414] rounded-md bg-paper overflow-hidden flex items-center justify-center">
                {urls[item.page - 1] ? (
                  <img
                    src={urls[item.page - 1]}
                    alt=""
                    draggable={false}
                    className="max-w-full max-h-full object-contain"
                    style={{ transform: transformFor(item.rotation) }}
                  />
                ) : (
                  <span className="w-6 h-6 rounded-full border-2 border-border-strong border-t-accent animate-spin" />
                )}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted">
                <span className="tabular-nums">{item.page}</span>
                {item.deleted && <span>{t("organize.deleted")}</span>}
              </div>
            </button>
          </div>
        ))}
      </div>

      {loading && <p className="text-sm text-muted">{t("organize.loading")}</p>}
    </div>
  );
}

/**
 * A quarter turn swaps the image's bounding box, which would push it outside
 * the card. The cards are a fixed 1:1.414 portrait, so scaling a rotated
 * preview by that same ratio is exactly what fits it back inside.
 */
function transformFor(rotation: number): string {
  const quarterTurn = Math.abs(((rotation % 360) + 360) % 360) % 180 === 90;
  return `rotate(${rotation}deg)${quarterTurn ? " scale(0.707)" : ""}`;
}

/** The line showing where a dragged card would land. */
function Insertion({ after }: { after?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute top-0 bottom-6 w-0.5 bg-accent z-10",
        after ? "-right-2" : "-left-2",
      )}
    />
  );
}
