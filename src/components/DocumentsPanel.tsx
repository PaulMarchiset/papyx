import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FileTray } from "@/components/FileTray";
import { Collapse } from "@/components/ui/Collapse";
import { UploadIcon } from "@/components/icons/UploadIcon";
import { BTN_PRIMARY, BTN_QUIET, CARD, TILE } from "@/components/ui/styles";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { FileTrayState } from "@/lib/useSourceFiles";
import type { AnyTool } from "@/components/tools/registry";

interface Props {
  tray: FileTrayState;
  dragging: boolean;
  tool: AnyTool | undefined;
  activeId: string | null;
  onActivate: (id: string) => void;
}

/**
 * The left half of the workspace: the documents, and nothing that acts on them.
 *
 * It is the same card before and after the first file. Empty, the drop area
 * fills it; once something is loaded the drop area eases down into a strip at
 * its foot while the rows slide in above — the card does not swap for another
 * one, the headline does not vanish from under the pointer, and nothing outside
 * the card moves at all. Both halves of that are `flex-grow` transitions, which
 * is the one way to interpolate between "fill what is left" and "be as tall as
 * a strip" without measuring anything.
 *
 * Dragging files over the window grows the strip back part of the way, so a
 * second drop has a target worth aiming at.
 */
export function DocumentsPanel({ tray, dragging, tool, activeId, onActivate }: Props) {
  const { t } = useTranslation();
  const files = tray.files;
  const hasFiles = files.length > 0;
  const single = tool != null && !tool.multiple;
  const picking = single && files.length > 1;
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const totalPages = files.reduce((sum, file) => sum + (file.pageCount ?? 0), 0);

  const grow = "flex-grow 480ms var(--ease-soft)";

  return (
    <section
      aria-label={t("documents.title")}
      className={cn(CARD, "h-full min-h-0 flex flex-col overflow-hidden")}
    >
      <header className="flex items-start gap-3 px-6 pt-5 pb-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-fg leading-tight">{t("documents.title")}</h2>
          {/* Always rendered, empty or not, so the header is one height and
              the list under it does not shift when the first file lands. */}
          <p className="mt-1 h-4 truncate text-xs text-muted">
            {hasFiles &&
              [
                t("common.files", { count: files.length }),
                formatBytes(totalSize),
                totalPages > 0 ? t("common.pages", { count: totalPages }) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
          </p>
        </div>
        {hasFiles && (
          <button type="button" onClick={tray.clear} className={BTN_QUIET}>
            <Trash2 className="w-3.5 h-3.5" />
            {t("common.clear")}
          </button>
        )}
      </header>

      {/* Grown in, not inserted: it arrives with a single-document tool and
          would otherwise shove the list down a line in one frame. */}
      <Collapse open={picking}>
        <p className="px-6 pb-2 text-xs text-muted">{t("files.pickHint")}</p>
      </Collapse>

      <div
        className="min-h-0 overflow-y-auto px-3"
        style={{ flexGrow: hasFiles ? 1 : 0, flexBasis: 0, transition: grow }}
      >
        <FileTray
          files={files}
          reorderable={Boolean(tool?.reorderable)}
          passwords={tray.passwords}
          activeId={single ? activeId : null}
          onActivate={single ? onActivate : undefined}
          onRemove={tray.remove}
          onMoveTo={tray.moveTo}
          onPassword={tray.setPassword}
        />
      </div>

      {tray.rejected.length > 0 && (
        <p className="px-6 pt-2 text-sm text-red-500">
          {tray.rejected.map((name) => t("files.unsupported", { name })).join(" ")}
        </p>
      )}

      <DropArea
        expanded={!hasFiles}
        dragging={dragging}
        loading={tray.loading}
        onBrowse={tray.browseAny}
        style={{
          flexGrow: !hasFiles ? 1 : dragging ? 0.6 : 0,
          flexBasis: "4.25rem",
          transition: grow,
        }}
      />
    </section>
  );
}

/**
 * One element, two faces: the welcome that fills an empty card, and the strip
 * that is left of it once files are in. The faces cross-fade inside the box
 * while the box itself changes size, so the transition is one continuous
 * movement rather than a swap.
 *
 * The whole area is the click target; the "button" inside it is a span, since
 * a real button would either swallow the click or fire it twice.
 */
function DropArea({
  expanded,
  dragging,
  loading,
  onBrowse,
  style,
}: {
  expanded: boolean;
  dragging: boolean;
  loading: boolean;
  onBrowse: () => void;
  style: React.CSSProperties;
}) {
  const { t } = useTranslation();
  // The face going away fades fast; the one arriving waits for it, so the two
  // are never legible on top of each other halfway through.
  const face = "absolute inset-0 flex transition-[opacity,visibility]";
  const leaving = "opacity-0 invisible duration-150";
  const arriving = "opacity-100 visible duration-300 delay-150";

  return (
    <div
      data-drop-area
      onClick={onBrowse}
      style={style}
      className={cn(
        // The dashed outline is the one border left in the app, and it is
        // there on purpose: it is the only surface asking to be used.
        "relative min-h-0 mx-3 mb-3 mt-2 rounded-2xl overflow-hidden cursor-pointer",
        "border border-dashed transition-colors",
        dragging
          ? "border-accent/70 bg-accent/8"
          : "border-accent/25 hover:border-accent/50 hover:bg-elevate-1",
        loading && "opacity-60 pointer-events-none",
      )}
    >
      {/* The welcome. */}
      <div
        aria-hidden={!expanded}
        className={cn(
          face,
          "flex-col items-center justify-center gap-5 px-8 text-center",
          expanded ? arriving : leaving,
        )}
      >
        <span
          className={cn(
            TILE,
            "w-16 h-16 rounded-2xl transition-colors",
            dragging ? "bg-accent text-white" : "bg-badge-bg text-accent",
          )}
        >
          <UploadIcon size={28} />
        </span>
        <div className="max-w-md">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg leading-tight">
            {t("home.tagline")}
          </h1>
          <p className="text-sm text-muted mt-3 leading-relaxed">{t("home.subtitle")}</p>
        </div>
        <p className={cn("text-sm transition-colors", dragging ? "text-fg" : "text-muted")}>
          {loading
            ? t("dropzone.reading")
            : dragging
              ? t("dropzone.active")
              : t("dropzone.idleAny")}
        </p>
        <span aria-hidden="true" className={cn(BTN_PRIMARY, "pointer-events-none")}>
          {t("dropzone.browse")}
        </span>
      </div>

      {/* The strip. */}
      <div
        aria-hidden={expanded}
        className={cn(
          face,
          "items-center justify-center gap-3 px-4 text-sm",
          expanded ? leaving : arriving,
        )}
      >
        <span
          className={cn(
            TILE,
            "w-8 h-8 rounded-lg transition-colors",
            dragging ? "bg-accent text-white" : "bg-badge-bg text-accent",
          )}
        >
          <UploadIcon size={16} />
        </span>
        <span className={dragging ? "text-fg" : "text-muted"}>
          {loading
            ? t("dropzone.reading")
            : dragging
              ? t("dropzone.active")
              : t("documents.dropMore")}
        </span>
        {!dragging && !loading && (
          <span className="font-medium text-accent">{t("documents.browseMore")}</span>
        )}
      </div>
    </div>
  );
}
