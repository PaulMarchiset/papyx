import { useCallback, useMemo, useState } from "react";
import { Settings as SettingsIcon, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Home } from "@/components/Home";
import { SettingsPanel } from "@/components/Settings";
import { WindowControls } from "@/components/WindowControls";
import { PapyxLogo } from "@/components/icons/PapyxLogo";
import { Modal } from "@/components/ui/Modal";
import { PILL_ICON } from "@/components/ui/pill";
import { findTool, TOOLS } from "@/components/tools/registry";
import type { ChainTarget } from "@/components/ResultCard";
import { SettingsProvider } from "@/lib/settingsContext";
import { useFileDrop } from "@/lib/useFileDrop";
import { useJob } from "@/lib/useJob";
import { useSourceFiles } from "@/lib/useSourceFiles";
import { useToolOptions } from "@/lib/useToolOptions";
import { isMacOS, isTauri } from "@/lib/platform";
import { cn } from "@/lib/cn";
import type { ToolId } from "@/lib/types";

/**
 * Tools worth offering right after a run, per kind of output. Curated rather
 * than "everything that accepts this kind": the point of chaining is to name
 * the two or three things people actually do next, not to re-list the grid.
 */
const CHAIN_AFTER_PDF: ToolId[] = ["compress", "page-numbers", "watermark", "split"];
const CHAIN_AFTER_IMAGE: ToolId[] = ["images-to-pdf", "convert-images"];

function AppShell() {
  const { t } = useTranslation();
  // Everything the work depends on lives here: the files, the open tool, the
  // running job and each tool's options. Screens are views over this, which is
  // what lets the tool change without the documents going anywhere.
  const [showSettings, setShowSettings] = useState(false);
  const [selectedId, setSelectedId] = useState<ToolId | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const tray = useSourceFiles();
  const job = useJob();
  const { optionsFor, patch } = useToolOptions();
  const dragging = useFileDrop(tray.add);
  /** An action held back by the unsaved-result prompt. */
  const [pending, setPending] = useState<{ run: () => void } | null>(null);

  const tool = selectedId ? findTool(selectedId) : undefined;
  const options = useMemo(
    () => (tool ? optionsFor(tool.id, tool.defaults) : {}),
    [tool, optionsFor],
  );

  // A tool sees only the files it can read; the single-document ones act on the
  // row the user picked in the tray (the first, until they pick another).
  const compatible = useMemo(
    () => (tool ? tray.files.filter((file) => file.kind === tool.accept) : []),
    [tray.files, tool],
  );
  const active =
    tool && !tool.multiple
      ? (compatible.find((file) => file.id === activeId) ?? compatible[0] ?? null)
      : null;
  const selectedFiles = useMemo(
    () => (tool ? (tool.multiple ? compatible : active ? [active] : []) : []),
    [tool, compatible, active],
  );

  /** Runs `action`, unless a finished run is still holding unsaved files. */
  const guard = useCallback(
    (action: () => void) => {
      if (job.hasUnsaved) {
        setPending({ run: action });
        return;
      }
      job.reset();
      action();
    },
    [job],
  );

  const onOptions = useCallback(
    (changes: Record<string, unknown>) => {
      if (tool) patch(tool.id, tool.defaults, changes);
    },
    [tool, patch],
  );

  // What the finished run produced decides what can come next: a PDF can be
  // compressed or stamped, images can be bound back into a document.
  const chain: ChainTarget[] = useMemo(() => {
    const outputs = job.state.outputs;
    if (job.state.status !== "done" || outputs.length === 0) return [];
    const kind = outputs.every((output) => output.mime === "application/pdf")
      ? "pdf"
      : outputs.every((output) => output.mime.startsWith("image/"))
        ? "image"
        : null;
    if (kind === null) return [];
    const wanted = kind === "pdf" ? CHAIN_AFTER_PDF : CHAIN_AFTER_IMAGE;
    return wanted
      .filter((id) => id !== tool?.id)
      .map((id) => TOOLS.find((candidate) => candidate.id === id))
      .filter((candidate): candidate is NonNullable<typeof candidate> => candidate != null)
      .map((candidate) => ({ id: candidate.id, icon: candidate.icon }));
  }, [job.state.status, job.state.outputs, tool]);

  const onChain = useCallback(
    async (id: ToolId) => {
      // The outputs become the inputs; nothing touches the disk on the way.
      const picked = job.state.outputs.map((output) => ({
        name: output.name,
        path: null,
        bytes: output.bytes,
      }));
      job.reset();
      setActiveId(null);
      setSelectedId(id);
      await tray.replace(picked);
    },
    [job, tray],
  );

  return (
    <div className="h-screen bg-bg text-fg flex flex-col">
      <header
        data-tauri-drag-region
        className={cn(
          "flex items-center h-16 flex-shrink-0 select-none",
          // macOS keeps its native traffic lights top-left, so the header is
          // padded to clear them; elsewhere we draw our own (WindowControls).
          isMacOS ? "pl-20" : "pl-7",
        )}
      >
        <div data-tauri-drag-region className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              guard(() => {
                setShowSettings(false);
                setSelectedId(null);
              })
            }
            className="pointer-events-auto"
            aria-label="Papyx"
          >
            <PapyxLogo />
          </button>
          <span className={cn(PILL_ICON, "bg-badge-bg text-badge-fg")}>
            <ShieldCheck className="w-3.5 h-3.5" />
            100% local
          </span>
        </div>

        <div data-tauri-drag-region className="flex-1 self-stretch" />

        <div className="flex items-center gap-3 pr-3">
          <button
            type="button"
            onClick={() => guard(() => setShowSettings((current) => !current))}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md border text-sm transition-colors",
              showSettings
                ? "border-transparent text-fg bg-surface-2"
                : "border-border-strong text-fg hover:bg-elevate-2",
            )}
          >
            <SettingsIcon className="w-4 h-4" />
            {t("common.settings")}
          </button>
        </div>

        {isTauri && !isMacOS && <WindowControls />}
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto">
        {/* One container for both views, and no `key` on it: keying it would
            remount the view that is *staying*, and Home holds the open tool,
            its previews and the result card. */}
        <div className="mx-auto w-full max-w-4xl px-7 pt-2 pb-[12vh]">
          {showSettings ? (
            <SettingsPanel />
          ) : (
            <Home
              tray={tray}
              dragging={dragging}
              tool={tool}
              selectedFiles={selectedFiles}
              ignored={tool ? tray.files.length - compatible.length : 0}
              activeId={active?.id ?? null}
              onActivate={setActiveId}
              onSelect={(id) =>
                guard(() => {
                  setSelectedId(id);
                  setActiveId(null);
                })
              }
              onClose={() => guard(() => setSelectedId(null))}
              job={job}
              options={options}
              onOptions={onOptions}
              chain={chain}
              onChain={onChain}
            />
          )}
        </div>
      </main>

      {pending && (
        <Modal
          title={t("unsaved.title")}
          description={t("unsaved.body", { count: job.state.outputs.length })}
          onClose={() => setPending(null)}
        >
          <button
            type="button"
            onClick={() => setPending(null)}
            className="px-3 py-2 rounded-md border border-border-strong text-sm text-fg hover:bg-elevate-2 transition-colors"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={() => {
              const action = pending.run;
              setPending(null);
              job.reset();
              action();
            }}
            className="px-3 py-2 rounded-md border border-border-strong text-sm text-muted hover:text-fg transition-colors"
          >
            {t("unsaved.discard")}
          </button>
          <button
            type="button"
            onClick={async () => {
              const action = pending.run;
              await job.save();
              setPending(null);
              job.reset();
              action();
            }}
            className="px-5 py-2.5 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent/85 transition-colors"
          >
            {t("unsaved.save")}
          </button>
        </Modal>
      )}
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <AppShell />
    </SettingsProvider>
  );
}
