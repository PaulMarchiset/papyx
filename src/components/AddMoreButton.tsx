import { Plus, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  /** Multi-input tools add to the list; single-input tools swap the file. */
  multiple: boolean;
  onClick: () => void;
}

/**
 * The dashed full-width button under a loaded file list — the same affordance
 * FFkit uses once a clip is loaded: the big drop zone has done its job and
 * stepping aside for the file card, but adding another file must stay one
 * click away.
 */
export function AddMoreButton({ multiple, onClick }: Props) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border text-sm text-muted hover:text-fg hover:border-border-hover transition-colors"
    >
      {multiple ? <Plus className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
      {multiple ? t("common.addFiles") : t("common.changeFile")}
    </button>
  );
}
