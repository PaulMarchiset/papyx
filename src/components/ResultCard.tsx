import { ArrowRight, Check, FolderOpen, Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatBytes, formatDelta, formatDuration } from "@/lib/format";
import { reveal } from "@/lib/services/fileSystem";
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
 * What a finished run produced. Purely a report: the actions that follow a run
 * live in the action bar, so the eye lands on one place for "what do I do now".
 * The exception is chaining — feeding the outputs to another tool is a
 * statement about *these files*, and it belongs next to them.
 */
export function ResultCard({ state, preview, showsDelta, chain, onChain }: Props) {
  const { t } = useTranslation();
  if (state.status !== "done") return null;
  const many = state.outputs.length > 1;

  return (
    <div className="rounded-2xl bg-surface px-6 py-6 space-y-5">
      <div>
        <div className="flex items-center gap-2 text-fg">
          <Check className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium">
            {t("result.outputs", { count: state.outputs.length })}
          </span>
        </div>
        <p className="text-sm text-muted mt-1">
          {showsDelta && state.inputSize > 0
            ? formatDelta(state.inputSize, state.outputSize)
            : formatBytes(state.outputSize)}
          {" · "}
          {formatDuration(state.elapsedMs)}
        </p>
      </div>

      {/* Where the files went is the question a run leaves behind, so it gets a
          line of its own rather than a corner of the action bar. */}
      <div className="flex items-start gap-3 rounded-xl bg-elevate-1 px-4 py-3">
        <span className="flex-shrink-0 mt-0.5 text-muted">
          {state.saved ? <FolderOpen className="w-4 h-4" /> : <Info className="w-4 h-4" />}
        </span>
        <div className="min-w-0 flex-1">
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
        {state.savedTo && (
          <button
            type="button"
            onClick={() => reveal(state.savedTo!)}
            className="flex-shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border-strong text-xs text-fg hover:bg-elevate-2 transition-colors"
          >
            {t("common.reveal")}
          </button>
        )}
      </div>

      {state.outputs.length > 0 && (
        <ul className="rounded-xl bg-elevate-1 divide-y divide-border-subtle max-h-52 overflow-y-auto">
          {state.outputs.map((output) => (
            <li
              key={output.name}
              className="flex items-center justify-between gap-4 px-4 py-2.5"
            >
              <span className="text-sm text-fg truncate">{output.name}</span>
              <span className="text-xs text-muted tabular-nums flex-shrink-0">
                {formatBytes(output.bytes.byteLength)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {preview && (
        <pre className="rounded-xl bg-elevate-1 px-4 py-3 text-xs font-mono text-subtle max-h-52 overflow-auto whitespace-pre-wrap">
          {preview}
        </pre>
      )}

      {chain.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border-soft">
          <span className="text-sm text-muted mt-4 mr-1">{t("result.chain")}</span>
          {chain.map(({ id, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onChain(id)}
              aria-label={t("result.chainWith", { tool: t(`tools.${id}.name`) })}
              className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border text-sm text-subtle hover:text-fg hover:border-border-hover transition-colors"
            >
              <Icon className="w-4 h-4" />
              {t(`tools.${id}.name`)}
              <ArrowRight className="w-3.5 h-3.5 text-muted" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
