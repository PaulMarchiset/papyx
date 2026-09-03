import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { saveOutputs } from "@/lib/services/fileSystem";
import { Cancelled, yieldToUi, type ProgressCallback } from "@/lib/pdf/progress";
import { useSettings } from "@/lib/settingsContext";
import { isTauri } from "@/lib/platform";
import type { OutputFile } from "@/lib/types";

export interface JobState {
  status: "idle" | "running" | "done" | "error";
  /** 0..1, or null while the total is unknown. */
  progress: number | null;
  outputs: OutputFile[];
  error: string | null;
  inputSize: number;
  outputSize: number;
  elapsedMs: number;
  /** Where the outputs landed, once saved. Null in the browser fallback. */
  savedTo: string | null;
  /** True once a save has completed, path or not. */
  saved: boolean;
}

const IDLE: JobState = {
  status: "idle",
  progress: null,
  outputs: [],
  error: null,
  inputSize: 0,
  outputSize: 0,
  elapsedMs: 0,
  savedTo: null,
  saved: false,
};

export type JobTask = (onProgress: ProgressCallback) => Promise<OutputFile[]>;

/**
 * Runs one tool invocation and owns everything the action bar and result card
 * show. Tool panels call `run` with a closure over their own options; error
 * mapping is theirs too, since only they know which failures are expected.
 *
 * Lives in the app shell rather than in the tool screen so that leaving a tool
 * with an unsaved result is something the shell can notice and ask about.
 */
export function useJob() {
  const [state, setState] = useState<JobState>(IDLE);
  const { settings } = useSettings();
  const { t } = useTranslation();
  // Guards against a stale run finishing after the user started another one.
  const runId = useRef(0);
  const aborter = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    runId.current += 1;
    aborter.current?.abort();
    setState(IDLE);
  }, []);

  const cancel = useCallback(() => aborter.current?.abort(), []);

  const save = useCallback(
    async (outputs: OutputFile[]) => {
      if (outputs.length === 0) return;
      const target = await saveOutputs(outputs, settings.outputDir, t("result.chooseFolder"));
      // The browser fallback downloads and has no path to report, but the save
      // did happen — `saved` is what the UI keys off, `savedTo` is the label.
      if (target === null && isTauri) return;
      setState((s) => ({ ...s, savedTo: target, saved: true }));
    },
    [settings.outputDir, t],
  );

  const run = useCallback(
    async (inputSize: number, task: JobTask) => {
      const id = ++runId.current;
      const controller = new AbortController();
      aborter.current = controller;
      const startedAt = performance.now();
      setState({ ...IDLE, status: "running", inputSize });

      const onProgress: ProgressCallback = async (done, total) => {
        // Cancellation rides the progress callback: throwing here unwinds
        // whichever page loop the operation is in. See pdf/progress.ts.
        if (controller.signal.aborted) throw new Cancelled();
        if (runId.current !== id) return;
        setState((s) => ({ ...s, progress: total > 0 ? done / total : null }));
        // The operations run on this thread, so without a yield the bar would
        // only paint once, at the end.
        await yieldToUi();
      };

      try {
        const outputs = await task(onProgress);
        if (runId.current !== id) return;
        const done: JobState = {
          ...IDLE,
          status: "done",
          progress: 1,
          outputs,
          inputSize,
          outputSize: outputs.reduce((sum, o) => sum + o.bytes.byteLength, 0),
          elapsedMs: performance.now() - startedAt,
        };
        setState(done);

        // A fixed output folder means the user has already answered the only
        // question a save would ask, so the run finishes the job: write the
        // files and let the result card report where they went.
        if (settings.outputDir) {
          try {
            const target = await saveOutputs(outputs, settings.outputDir);
            if (runId.current === id) {
              setState((s) => ({ ...s, savedTo: target, saved: true }));
            }
          } catch (error) {
            // The work itself succeeded — surface the write failure but keep
            // the outputs, so saving somewhere else is still possible.
            if (runId.current === id) {
              setState((s) => ({
                ...s,
                error: error instanceof Error ? error.message : String(error),
              }));
            }
          }
        }
      } catch (error) {
        if (runId.current !== id) return;
        if (error instanceof Cancelled) {
          setState(IDLE);
          return;
        }
        setState({
          ...IDLE,
          status: "error",
          inputSize,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [settings.outputDir],
  );

  /** True while a finished run holds files that exist only in memory. */
  const hasUnsaved =
    state.status === "done" && state.outputs.length > 0 && !state.saved;

  return {
    state,
    hasUnsaved,
    run,
    cancel,
    reset,
    save: useCallback(() => save(state.outputs), [save, state.outputs]),
  };
}

export type Job = ReturnType<typeof useJob>;
