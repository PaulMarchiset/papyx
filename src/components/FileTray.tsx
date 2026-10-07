import { useState } from "react";
import { FileText, GripVertical, ImageIcon, Lock, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatBytes } from "@/lib/format";
import { Pill } from "@/components/ui/pill";
import { BTN_ICON } from "@/components/ui/styles";
import { TextField } from "@/components/ui/Field";
import { useFileThumbnails } from "@/lib/useFileThumbnails";
import { useFlip } from "@/lib/useFlip";
import { usePreview } from "@/components/Preview";
import { cn } from "@/lib/cn";
import type { SourceFile } from "@/lib/types";

interface Props {
  files: SourceFile[];
  /** Shows the drag handles — order only means something for some tools. */
  reorderable: boolean;
  passwords: Record<string, string>;
  /** Set by single-document tools; the list then acts as a picker. */
  activeId?: string | null;
  onActivate?: (id: string) => void;
  onRemove: (id: string) => void;
  onMoveTo: (from: number, to: number) => void;
  onPassword: (id: string, password: string) => void;
}

/**
 * The loaded files, one row each, inside the Documents panel (which owns the
 * summary line and the drop area under the list).
 *
 * Rows never jump: one that arrives slides in, one that leaves lets the others
 * close the gap, and a reorder glides every row it displaced — see useFlip.
 *
 * Tools that rebuild a single document pass `onActivate`, which turns the rows
 * into a choice of subject rather than a list of inputs.
 */
export function FileTray({
  files,
  reorderable,
  passwords,
  activeId,
  onActivate,
  onRemove,
  onMoveTo,
  onPassword,
}: Props) {
  const { t } = useTranslation();
  const thumbnails = useFileThumbnails(files);
  const preview = usePreview();
  const list = useFlip<HTMLUListElement>(files.map((file) => file.id).join(","));
  // Index the dragged row would land at, i.e. "insert before this row".
  const [dropAt, setDropAt] = useState<number | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  const canDrag = reorderable && files.length > 1;
  const picking = Boolean(onActivate) && files.length > 1;

  const finishDrag = () => {
    if (dragFrom != null && dropAt != null) {
      // Dropping just after itself is a no-op, not a move by one.
      const to = dropAt > dragFrom ? dropAt - 1 : dropAt;
      onMoveTo(dragFrom, to);
    }
    setDragFrom(null);
    setDropAt(null);
  };

  return (
    <ul ref={list} className="space-y-1">
      {files.map((file, index) => {
        const isActive = picking && file.id === activeId;
        return (
          <li
            key={file.id}
            data-flip={file.id}
            draggable={canDrag}
            onDragStart={() => setDragFrom(index)}
            onDragEnd={finishDrag}
            onDragOver={(event) => {
              if (!canDrag || dragFrom == null) return;
              event.preventDefault();
              // Which half of the row the pointer is over decides whether the
              // insertion line sits above or below it.
              const box = event.currentTarget.getBoundingClientRect();
              setDropAt(event.clientY < box.top + box.height / 2 ? index : index + 1);
            }}
            onDrop={(event) => {
              event.preventDefault();
              finishDrag();
            }}
            onClick={onActivate ? () => onActivate(file.id) : undefined}
            className={cn(
              "group/row relative rounded-xl px-3 py-2.5 transition-colors",
              dragFrom === index && "opacity-40",
              picking && "cursor-pointer",
              isActive ? "bg-badge-bg" : "hover:bg-elevate-1",
              picking && !isActive && "opacity-60 hover:opacity-100",
            )}
          >
            {dropAt === index && <Insertion />}
            {dropAt === files.length && index === files.length - 1 && <Insertion bottom />}

            <div className="flex items-center gap-3">
              {canDrag && (
                <span
                  className="flex-shrink-0 -ml-1 text-muted/60 group-hover/row:text-muted cursor-grab active:cursor-grabbing"
                  aria-hidden="true"
                >
                  <GripVertical className="w-4 h-4" />
                </span>
              )}

              <Preview
                file={file}
                url={thumbnails[file.id]}
                label={t("preview.open")}
                onOpen={() => preview({ file })}
              />

              <div className="min-w-0 flex-1">
                <div className="text-sm text-fg truncate" title={file.path ?? file.name}>
                  {file.name}
                </div>
                <div className="text-xs text-muted mt-1">{formatBytes(file.size)}</div>
              </div>

              {file.locked ? (
                <Pill icon={<Lock className="w-3.5 h-3.5" />} className="bg-badge-bg text-badge-fg">
                  {t("files.locked")}
                </Pill>
              ) : file.pageCount != null ? (
                <Pill className="bg-elevate-2 text-subtle">
                  {t("common.pages", { count: file.pageCount })}
                </Pill>
              ) : null}

              <button
                type="button"
                aria-label={t("common.remove")}
                onClick={(event) => {
                  event.stopPropagation();
                  onRemove(file.id);
                }}
                className={cn(
                  BTN_ICON,
                  "p-1.5 opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 hover:text-red-500",
                )}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {file.locked && (
              <div className="mt-3 flex flex-wrap items-center gap-3 pl-12">
                <TextField
                  value={passwords[file.id] ?? ""}
                  onChange={(value) => onPassword(file.id, value)}
                  placeholder={t("files.password")}
                  className="w-56"
                />
                <span className="text-xs text-muted">{t("files.passwordHint")}</span>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * First page (or the image itself) on a sheet of paper, icon until it lands.
 * Clicking it opens the large preview — its own click, so it does not also
 * pick the row in a single-document tool.
 */
function Preview({
  file,
  url,
  label,
  onOpen,
}: {
  file: SourceFile;
  url?: string;
  label: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`${label} — ${file.name}`}
      title={label}
      disabled={file.locked}
      onClick={(event) => {
        event.stopPropagation();
        onOpen();
      }}
      className="flex-shrink-0 w-9 h-12 rounded-md overflow-hidden bg-paper shadow-card flex items-center justify-center text-muted cursor-zoom-in hover:ring-2 hover:ring-accent/40 disabled:cursor-default disabled:hover:ring-0"
    >
      {url ? (
        <img src={url} alt="" draggable={false} className="w-full h-full object-cover" />
      ) : file.kind === "pdf" ? (
        <FileText className="w-4 h-4" />
      ) : (
        <ImageIcon className="w-4 h-4" />
      )}
    </button>
  );
}

/** The line showing where a dragged row would land. */
function Insertion({ bottom }: { bottom?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute left-2 right-2 h-0.5 rounded-full bg-accent",
        bottom ? "-bottom-[3px]" : "-top-[3px]",
      )}
    />
  );
}
