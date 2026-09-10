import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { BTN_PRIMARY, TILE } from "@/components/ui/styles";
import { UploadIcon } from "@/components/icons/UploadIcon";

interface Props {
  kind: "pdf" | "image" | "any";
  multiple: boolean;
  dragging: boolean;
  loading: boolean;
  onClick: () => void;
}

/**
 * The empty state: one dashed squircle, an icon on an accent tile, and the
 * action as a pill under it.
 *
 * The pill is a span, not a button — the whole zone is the click target, and a
 * real button inside it would either swallow the click or fire it twice. It is
 * there to say "this is pressable", which the dashed outline alone does not.
 */
export function FileDropZone({ kind, multiple, dragging, loading, onClick }: Props) {
  const { t } = useTranslation();
  const idle =
    kind === "any"
      ? "dropzone.idleAny"
      : kind === "image"
        ? "dropzone.idleImages"
        : multiple
          ? "dropzone.idlePdfs"
          : "dropzone.idlePdf";

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative w-full rounded-3xl flex flex-col items-center justify-center gap-4",
        "border border-dashed transition-colors cursor-pointer py-12",
        // The dash is drawn in the accent rather than the border grey: this is
        // the one place in the app that is asking to be used, and a neutral
        // outline on a neutral card reads as a disabled area.
        dragging
          ? "border-accent/70 bg-accent/8"
          : "border-accent/25 bg-surface hover:border-accent/50",
        loading && "opacity-60 pointer-events-none",
      )}
    >
      <span
        className={cn(
          TILE,
          "w-16 h-16 transition-colors",
          dragging ? "bg-accent text-white" : "bg-accent/12 text-accent",
        )}
      >
        <UploadIcon size={30} />
      </span>

      <p className={cn("text-sm transition-colors", dragging ? "text-fg" : "text-muted")}>
        {loading ? t("dropzone.reading") : dragging ? t("dropzone.active") : t(idle)}
      </p>

      <span aria-hidden="true" className={cn(BTN_PRIMARY, "pointer-events-none")}>
        {t("dropzone.browse")}
      </span>
    </div>
  );
}
