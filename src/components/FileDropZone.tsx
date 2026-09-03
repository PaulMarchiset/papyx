import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { UploadIcon } from "@/components/icons/UploadIcon";

interface Props {
  kind: "pdf" | "image" | "any";
  multiple: boolean;
  dragging: boolean;
  loading: boolean;
  onClick: () => void;
}

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
        "relative w-full rounded-2xl bg-surface flex flex-col items-center justify-center gap-4",
        "border border-dashed transition-colors cursor-pointer",
        dragging ? "border-accent/60 bg-accent/5" : "border-border hover:border-border-hover",
        loading && "opacity-60 pointer-events-none",
        "py-14",
      )}
    >
      <span className={cn("transition-colors", dragging ? "text-accent" : "text-muted")}>
        <UploadIcon size={40} />
      </span>

      <p className={cn("text-sm transition-colors", dragging ? "text-fg" : "text-muted")}>
        {loading ? t("dropzone.reading") : dragging ? t("dropzone.active") : t(idle)}
      </p>

    </div>
  );
}
