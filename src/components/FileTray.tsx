import { useState } from "react";
import { FileText, GripVertical, ImageIcon, Lock, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatBytes } from "@/lib/format";
import { PILL_BASE, PILL_ICON } from "@/components/ui/pill";
import { BTN_ICON, CARD, TILE } from "@/components/ui/styles";
import { TextField } from "@/components/ui/Field";
import { UploadIcon } from "@/components/icons/UploadIcon";
import { useFileThumbnails } from "@/lib/useFileThumbnails";
import { cn } from "@/lib/cn";
import type { SourceFile } from "@/lib/types";

interface Props {
  files: SourceFile[];
  /** Shows the drag handles — order only means something for some tools. */
  reorderable: boolean;
  loading: boolean;
  passwords: Record<string, string>;
  /** Set by single-document tools; the tray then acts as a picker. */
  activeId?: string | null;
  onActivate?: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onMoveTo: (from: number, to: number) => void;
  onPassword: (id: string, password: string) => void;
}

/**
 * The loaded files, as one card: an aggregate header that doubles as the "add
 * more" target, then a row per file. Same shape as FFkit's batch list, which is
 * where the pattern of summarising the set above the rows comes from.
 *
 * Tools that rebuild a single document pass `onActivate`, which turns the rows
 * into a choice of subject rather than a list of inputs.
 */
export function FileTray({
  files,
  reorderable,
  loading,
  passwords,
  activeId,
  onActivate,
  onAdd,
  onRemove,
  onMoveTo,
  onPassword,
}: Props) {
  const { t } = useTranslation();
  const thumbnails = useFileThumbnails(files);
  // Index the dragged row would land at, i.e. "insert before this row".
  const [dropAt, setDropAt] = useState<number | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  if (files.length === 0) return null;

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const totalPages = files.reduce((sum, file) => sum + (file.pageCount ?? 0), 0);
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
    <div className={cn(CARD, "w-full overflow-hidden")}>
      {files.length > 1 && (
        <div className="relative px-5 pt-5 pb-4 cursor-pointer group" onClick={onAdd}>
          <div className="flex items-start gap-4 pr-28">
            <div className={cn(TILE, "flex-shrink-0 w-10 h-10 bg-accent/15 text-accent")}>
              <UploadIcon size={18} />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-fg text-sm">
                {t("common.files", { count: files.length })}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted leading-none">
                <span>{formatBytes(totalSize)}</span>
                {totalPages > 0 && (
                  <>
                    <span className="text-subtle/40">·</span>
                    <span>{t("common.pages", { count: totalPages })}</span>
                  </>
                )}
                {picking && (
                  <>
                    <span className="text-subtle/40">·</span>
                    <span>{t("files.pickHint")}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <span
            className={cn(
              PILL_ICON,
              "absolute top-4 right-4 bg-elevate-2 text-muted group-hover:text-fg transition-colors",
            )}
          >
            {loading ? t("dropzone.reading") : t("common.addFiles")}
          </span>
        </div>
      )}

      <ul
        className={cn(
          "divide-y divide-border-soft",
          files.length > 1 && "border-t border-border-soft",
        )}
      >
        {files.map((file, index) => {
          const isActive = picking && file.id === activeId;
          return (
            <li
              key={file.id}
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
                "group/row relative px-5 py-3 transition-colors",
                dragFrom === index && "opacity-40",
                picking && "cursor-pointer",
                isActive && "bg-accent/8",
                picking && !isActive && "opacity-60 hover:opacity-100",
              )}
            >
              {dropAt === index && <Insertion />}
              {dropAt === files.length && index === files.length - 1 && <Insertion bottom />}
              {isActive && (
                <span aria-hidden="true" className="absolute inset-y-0 left-0 w-0.5 bg-accent" />
              )}

              <div className="flex items-center gap-3">
                {canDrag && (
                  <span
                    className="flex-shrink-0 -ml-2 text-muted/60 group-hover/row:text-muted cursor-grab active:cursor-grabbing"
                    aria-hidden="true"
                  >
                    <GripVertical className="w-4 h-4" />
                  </span>
                )}

                <Preview file={file} url={thumbnails[file.id]} />

                <div className="min-w-0 flex-1">
                  <div className="text-sm text-fg truncate" title={file.path ?? file.name}>
                    {file.name}
                  </div>
                  <div className="text-xs text-muted mt-0.5">{formatBytes(file.size)}</div>
                </div>

                {file.locked ? (
                  <span className={cn(PILL_ICON, "bg-badge-bg text-badge-fg")}>
                    <Lock className="w-3.5 h-3.5" />
                    {t("files.locked")}
                  </span>
                ) : file.pageCount != null ? (
                  <span className={cn(PILL_BASE, "bg-elevate-3 text-subtle")}>
                    {t("common.pages", { count: file.pageCount })}
                  </span>
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
                    "ml-1 p-1.5 opacity-0 group-hover/row:opacity-100 hover:text-red-400",
                  )}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {file.locked && (
                <div className="mt-3 flex items-center gap-3 pl-11">
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
    </div>
  );
}

/** First page (or the image itself) on a paper-white card, icon until it lands. */
function Preview({ file, url }: { file: SourceFile; url?: string }) {
  return (
    <span className="flex-shrink-0 w-8 h-10 rounded-[7px] overflow-hidden bg-paper border border-border-soft flex items-center justify-center text-muted">
      {url ? (
        <img src={url} alt="" draggable={false} className="w-full h-full object-cover" />
      ) : file.kind === "pdf" ? (
        <FileText className="w-4 h-4" />
      ) : (
        <ImageIcon className="w-4 h-4" />
      )}
    </span>
  );
}

/** The line showing where a dragged row would land. */
function Insertion({ bottom }: { bottom?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute left-0 right-0 h-0.5 bg-accent",
        bottom ? "bottom-0" : "-top-px",
      )}
    />
  );
}
