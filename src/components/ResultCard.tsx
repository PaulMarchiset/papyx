import { ArrowRight, Check, FolderOpen, Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatBytes, formatDelta, formatDuration } from "@/lib/format";
import { BTN_QUIET, INSET, TILE } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import type { JobState } from "@/lib/useJob";
import type { ToolId } from "@/lib/types";

export interface ChainTarget {
  id: ToolId;
  icon: LucideIcon;
}

interface Props {
  state: JobState;
  /** Show the before/after size line — only the compressor is about size. */
  showsDelta?: boolean;
  /** Plain-text preview shown for the text extractor. */
  preview?: string;
  /** Tools that can take these outputs as their input. */
  chain: ChainTarget[];
  onChain: (id: ToolId) => void;
}

/**
 * What a finished run produced, grown into the tool panel just above its
 * action bar — next to the Save button it is the subject of, and never below
 * the fold, which is where a card under the panel used to land.
 *
 * Purely a report: Save and Open folder are the bar's. The exception is
 * chaining — feeding the outputs to another tool is a statement about *these
 * files*, and it belongs next to them.
 */
export function ResultCard({ state, preview, showsDelta, chain, onChain }: Props) {
  const { t } = useTranslation();
  if (state.status !== "done") return null;
  const many = state.outputs.length > 1;

  return (
    <div className="px-6 pt-2">
      <div className={cn(INSET, "max-h-[40vh] overflow-y-auto p-4 space-y-4")}>
        <div className="flex items-center gap-3">
          <span className={cn(TILE, "flex-shrink-0 w-9 h-9 bg-badge-bg text-accent")}>
            <Check className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-fg">
              {t("result.outputs", { count: state.outputs.length })}
            </p>
            <p className="text-xs text-muted mt-1">
              {showsDelta && state.inputSize > 0
                ? formatDelta(state.inputSize, state.outputSize)
                : formatBytes(state.outputSize)}
              {" · "}
              {formatDuration(state.elapsedMs)}
            </p>
          </div>
        </div>

        {/* Where the files went is the question a run leaves behind. */}
        <div className="flex items-start gap-2.5">
          <span className="flex-shrink-0 mt-0.5 text-muted">
            {state.saved ? <FolderOpen className="w-4 h-4" /> : <Info className="w-4 h-4" />}
          </span>
          <div className="min-w-0">
            <p className="text-sm text-fg break-all">
              {!state.saved
                ? t("result.notSaved")
                : state.savedTo
                  ? t(many ? "result.savedTo" : "result.savedAs", { path: state.savedTo })
                  : t("result.downloaded")}
            </p>
            {!state.saved && (
              <p className="text-xs text-muted mt-1">
                {t("result.notSavedHint", { count: state.outputs.length })}
              </p>
            )}
          </div>
        </div>

        {state.outputs.length > 0 && (
          <ul className="rounded-xl bg-surface divide-y divide-border-subtle max-h-36 overflow-y-auto">
            {state.outputs.map((output) => (
              <li key={output.name} className="flex items-center justify-between gap-4 px-3 py-2">
                <span className="text-sm text-fg truncate">{output.name}</span>
                <span className="text-xs text-muted tabular-nums flex-shrink-0">
                  {formatBytes(output.bytes.byteLength)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {preview && (
          <pre className="rounded-xl bg-surface px-3 py-2.5 text-xs font-mono text-subtle max-h-36 overflow-auto whitespace-pre-wrap">
            {preview}
          </pre>
        )}

        {chain.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted mr-1">{t("result.chain")}</span>
            {chain.map(({ id, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => onChain(id)}
                aria-label={t("result.chainWith", { tool: t(`tools.${id}.name`) })}
                className={cn(BTN_QUIET, "bg-surface")}
              >
                <Icon className="w-3.5 h-3.5" />
                {t(`tools.${id}.name`)}
                <ArrowRight className="w-3 h-3 text-muted" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
