import { Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { PILL_ICON } from "@/components/ui/pill";
import { useUpdater } from "@/lib/updaterContext";

/**
 * What "Later" leaves behind. Waving the dialog away should not mean the update
 * is gone until the next launch, so it folds down into the header — visible,
 * one click from the dialog, and out of the way of the work.
 */
export function UpdateChip({ onOpen }: { onOpen: (open: () => void) => void }) {
  const { t } = useTranslation();
  const { stage, version, dismissed, reopen } = useUpdater();

  // Also after a failed install: the update is still waiting, and this is the
  // only way back to the dialog once it has been closed.
  const waiting = stage === "available" || (stage === "error" && version != null);
  if (!waiting || !dismissed) return null;

  return (
    <button
      type="button"
      onClick={() => onOpen(reopen)}
      className={cn(PILL_ICON, "bg-accent/15 text-accent hover:bg-accent/25 transition-colors")}
    >
      <Download className="w-3.5 h-3.5" />
      {t("update.chip")}
    </button>
  );
}
