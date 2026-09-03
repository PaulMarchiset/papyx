import { useCallback, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ActionBar } from "@/components/ActionBar";
import { PresetRow } from "@/components/PresetRow";
import { ResultCard, type ChainTarget } from "@/components/ResultCard";
import { Section } from "@/components/ui/Section";
import type { AnyTool } from "@/components/tools/registry";
import { PasswordRequiredError } from "@/lib/pdf/pdfjs";
import { ToolError } from "@/lib/toolError";
import { reveal } from "@/lib/services/fileSystem";
import type { Job } from "@/lib/useJob";
import type { SourceFile, ToolId } from "@/lib/types";

interface Props {
  tool: AnyTool;
  /** The files this run will act on, already filtered and ordered. */
  files: SourceFile[];
  passwords: Record<string, string>;
  /** Files in the tray this tool cannot read. */
  ignored: number;
  job: Job;
  options: Record<string, unknown>;
  onOptions: (patch: Record<string, unknown>) => void;
  chain: ChainTarget[];
  onChain: (id: ToolId) => void;
  onClose: () => void;
}

/**
 * A tool's settings and its run, opened in place under the grid rather than on
 * a screen of its own: the documents stay in view, and changing your mind about
 * the tool is one click on another card instead of a round trip.
 */
export function ToolPanel({
  tool,
  files,
  passwords,
  ignored,
  job,
  options,
  onOptions,
  chain,
  onChain,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const anchor = useRef<HTMLDivElement>(null);

  // Opening a tool from a card halfway up the page would otherwise leave its
  // options below the fold.
  useEffect(() => {
    anchor.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [tool.id]);

  // A result describes the files and settings it came from; changing either
  // clears it rather than leaving a stale card under a new document.
  const signature = `${files.map((file) => file.id).join(",")}|${JSON.stringify(options)}`;
  const { reset } = job;
  useEffect(() => {
    reset();
  }, [signature, reset]);

  const patch = useCallback(
    (changes: Record<string, unknown>) => onOptions(changes),
    [onOptions],
  );

  const run = () =>
    job.run(
      files.reduce((sum, file) => sum + file.size, 0),
      async (onProgress) => {
        try {
          return await tool.run({
            files,
            options,
            passwordFor: (file) => passwords[file.id] || undefined,
            onProgress,
          });
        } catch (error) {
          // Expected failures carry a translation key; anything else is a bug
          // and reaches the user through the generic message in useJob.
          if (error instanceof ToolError) throw new Error(t(error.key, error.params));
          if (error instanceof PasswordRequiredError) {
            throw new Error(
              t(error.wrongPassword ? "errors.wrongPassword" : "errors.passwordRequired"),
            );
          }
          throw error;
        }
      },
    );

  const Options = tool.Options;

  return (
    <div ref={anchor} className="space-y-4 scroll-mt-4 animate-rise">
      <Section>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-fg">{t(`tools.${tool.id}.name`)}</h2>
            <p className="text-sm text-muted mt-1">{t(`tools.${tool.id}.desc`)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="flex-shrink-0 p-1.5 rounded-md text-muted hover:text-fg hover:bg-elevate-3 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {ignored > 0 && (
          <p className="text-sm text-muted">
            {t(tool.accept === "pdf" ? "files.ignoredImages" : "files.ignoredPdfs", {
              count: ignored,
            })}
          </p>
        )}

        {files.length === 0 ? (
          <p className="text-sm text-muted">
            {t(tool.accept === "pdf" ? "tools.needs.pdf" : "tools.needs.image")}
          </p>
        ) : (
          <>
            {tool.presets && (
              <PresetRow presets={tool.presets} options={options} onApply={patch} />
            )}
            <Options value={options} onChange={patch} files={files} />
          </>
        )}
      </Section>

      <ActionBar
        state={job.state}
        canRun={files.length > 0}
        runLabel={tool.runLabel ? t(tool.runLabel) : undefined}
        onRun={run}
        onCancel={job.cancel}
        onSave={job.save}
        onReveal={() => job.state.savedTo && reveal(job.state.savedTo)}
      />

      <ResultCard
        state={job.state}
        showsDelta={tool.showsDelta}
        preview={tool.preview?.(job.state.outputs)}
        chain={chain}
        onChain={onChain}
      />
    </div>
  );
}
