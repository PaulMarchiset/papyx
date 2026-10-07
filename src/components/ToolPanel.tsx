import { useCallback, useEffect } from "react";
import { Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ActionBar } from "@/components/ActionBar";
import { PresetRow } from "@/components/PresetRow";
import { ResultCard, type ChainTarget } from "@/components/ResultCard";
import { Collapse } from "@/components/ui/Collapse";
import { BTN_ICON, CARD, TILE } from "@/components/ui/styles";
import { PapyxMark } from "@/components/icons/PapyxLogo";
import type { AnyTool } from "@/components/tools/registry";
import { PasswordRequiredError } from "@/lib/pdf/pdfjs";
import { ToolError } from "@/lib/toolError";
import { reveal } from "@/lib/services/fileSystem";
import { cn } from "@/lib/cn";
import type { Job } from "@/lib/useJob";
import type { SourceFile, ToolId } from "@/lib/types";

interface Props {
  /** The open tool; without one the panel explains how to begin. */
  tool: AnyTool | undefined;
  /** The files this run will act on, already filtered and ordered. */
  files: SourceFile[];
  /** Whether anything at all is loaded, compatible or not. */
  hasFiles: boolean;
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
 * The right half of the workspace: one card, the full height of the window,
 * whatever tool is open.
 *
 * Its three floors never trade places. The heading on top; the options in the
 * middle, which scroll when there are many of them; and at the bottom the
 * result (grown in once there is one) and the action bar. Changing tool swaps
 * what is inside the card, never the card — so the button you press to run is
 * in the same spot for every tool, and a long tool cannot push it off screen.
 */
export function ToolPanel({
  tool,
  files,
  hasFiles,
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

  // A result describes the files and settings it came from; changing either
  // clears it rather than leaving a stale report under a new document.
  const signature = `${tool?.id}|${files.map((file) => file.id).join(",")}|${JSON.stringify(options)}`;
  const { reset } = job;
  useEffect(() => {
    reset();
  }, [signature, reset]);

  const patch = useCallback(
    (changes: Record<string, unknown>) => onOptions(changes),
    [onOptions],
  );

  if (!tool) {
    return (
      <section data-card className={cn(CARD, "h-full min-h-0 flex flex-col overflow-hidden")}>
        <Guide hasFiles={hasFiles} />
      </section>
    );
  }

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
  const Icon = tool.icon;

  return (
    <section data-card className={cn(CARD, "h-full min-h-0 flex flex-col overflow-hidden")}>
      <header className="flex items-start gap-3.5 px-6 pt-5 pb-4">
        <span className={cn(TILE, "flex-shrink-0 w-10 h-10 bg-badge-bg text-accent")}>
          <Icon className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className="text-lg font-semibold text-fg leading-tight">
            {t(`tools.${tool.id}.name`)}
          </h2>
          <p className="text-sm text-muted mt-1">{t(`tools.${tool.id}.desc`)}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={t("common.close")} className={BTN_ICON}>
          <X className="w-4 h-4" />
        </button>
      </header>

      {/* The options scroll on their own and fade into the floor below, so a
          long tool reads as continuing rather than as cut off. */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 [mask-image:linear-gradient(to_bottom,black_calc(100%-1.5rem),transparent)]">
        <div key={tool.id} data-options className="space-y-5">
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
        </div>
      </div>

      <Collapse open={job.state.status === "done"}>
        <ResultCard
          state={job.state}
          showsDelta={tool.showsDelta}
          preview={tool.preview?.(job.state.outputs)}
          chain={chain}
          onChain={onChain}
        />
      </Collapse>

      <ActionBar
        state={job.state}
        canRun={files.length > 0}
        runLabel={tool.runLabel ? t(tool.runLabel) : undefined}
        onRun={run}
        onCancel={job.cancel}
        onSave={job.save}
        onReveal={() => job.state.savedTo && reveal(job.state.savedTo)}
      />
    </section>
  );
}

/**
 * The panel before any tool is open: the three steps, the first ticked once
 * there are documents. It holds the place the tool will open into, so picking
 * one fills this card rather than making a card appear.
 */
function Guide({ hasFiles }: { hasFiles: boolean }) {
  const { t } = useTranslation();
  const steps = [t("guide.step1"), t("guide.step2"), t("guide.step3")];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-10 py-8 text-center">
      <span className={cn(TILE, "w-14 h-14 rounded-2xl bg-paper shadow-card")}>
        <PapyxMark size={56} />
      </span>
      <h2 className="mt-5 text-xl font-semibold tracking-[-0.02em] text-fg">
        {t("guide.title")}
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted leading-relaxed">{t("guide.body")}</p>

      <ol className="mt-8 w-full max-w-sm space-y-2 text-left">
        {steps.map((step, index) => {
          const done = index === 0 && hasFiles;
          return (
            <li key={step} className="flex items-center gap-3 rounded-xl bg-elevate-1 px-4 py-3">
              <span
                className={cn(
                  TILE,
                  "w-6 h-6 rounded-md text-xs font-semibold tabular-nums transition-colors",
                  done ? "bg-accent text-white" : "bg-elevate-3 text-subtle",
                )}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : index + 1}
              </span>
              <span className={cn("text-sm", done ? "text-muted line-through" : "text-fg")}>
                {step}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
