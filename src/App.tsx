import { useCallback, useMemo, useState } from "react";
import { Settings as SettingsIcon, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Workspace } from "@/components/Workspace";
import { PreviewProvider } from "@/components/Preview";
import { ToolSidebar } from "@/components/ToolSidebar";
import { SettingsDialog } from "@/components/Settings";
import { UpdateChip } from "@/components/UpdateChip";
import { UpdatePrompt } from "@/components/UpdatePrompt";
import { WindowControls } from "@/components/WindowControls";
import { PapyxLogo } from "@/components/icons/PapyxLogo";
import { Modal } from "@/components/ui/Modal";
import { Pill } from "@/components/ui/pill";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/ui/styles";
import { findTool, TOOLS } from "@/components/tools/registry";
import type { ChainTarget } from "@/components/ResultCard";
import { SettingsProvider } from "@/lib/settingsContext";
import { UpdaterProvider } from "@/lib/updaterContext";
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
      {/* One title bar: the lockup on the left, the window's own buttons on
          the right. The buttons run the bar's full height and are a little
          taller than wide (60 x 76): that keeps their glyphs on the logo's
          centre line *and* hands the top-right corner pixel to Close — the
          easiest target on the screen, where Windows users throw the pointer
          to close. Neither may be traded for the other. The whole bar is a
          drag region except what is clickable; on macOS the left padding
          clears the traffic lights, in a browser the bar is simply the header. */}
      <header
        data-tauri-drag-region
        className={cn(
          "flex items-center h-[4.75rem] flex-shrink-0 select-none",
          isMacOS ? "pl-24" : "pl-6",
        )}
      >
        <div data-tauri-drag-region className="flex items-center gap-3">
          {/* flex, not the default inline box: an inline button keeps room for
              a descender under the lockup, which is what sat the badge low. */}
          <button
            type="button"
            onClick={() => guard(() => setSelectedId(null))}
            className="flex items-center rounded-lg"
            aria-label="Papyx"
          >
            <PapyxLogo size={19} />
          </button>
          <Pill
            icon={<ShieldCheck className="w-3.5 h-3.5" />}
            className="bg-badge-bg text-badge-fg"
          >
            100% local
          </Pill>
        </div>

        <div data-tauri-drag-region className="flex-1 self-stretch" />

        {isTauri && !isMacOS ? <WindowControls /> : <div className="w-6" />}
      </header>

      {/* Below the header the window is a fixed frame and nothing scrolls it:
          the tools on the left, always in the same place, and the workspace.
          Settings open as a dialog over it, so nothing here ever goes away. */}
      <div className="flex-1 min-h-0 flex gap-5 px-6 pt-2 pb-6">
        {/* The tools, and at the foot of the same column the two things that
            are about the app rather than the work: a waiting update, and
            Settings. Bottom-left is where a desktop app keeps its gear, and it
            frees the title bar for the window's own buttons. */}
        <aside className="w-52 xl:w-60 flex-shrink-0 min-h-0 flex flex-col gap-3">
          <div className="flex-1 min-h-0">
            <ToolSidebar
              files={tray.files}
              selected={tool?.id ?? null}
              onSelect={(id) =>
                guard(() => {
                  setSelectedId(id);
                  setActiveId(null);
                })
              }
            />
          </div>

          {/* Guarded like every other way out of a finished run: installing an
              update restarts the app, and an unsaved result would go with it. */}
          <div className="empty:hidden">
            <UpdateChip onOpen={guard} />
          </div>

          <button
            type="button"
            aria-pressed={showSettings}
            // Not guarded: a dialog over the workspace leaves the result where
            // it is. Installing an update from inside it is guarded instead.
            onClick={() => setShowSettings(true)}
            className={cn(
              "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
              showSettings
                ? "bg-surface shadow-card text-fg"
                : "text-subtle hover:text-fg hover:bg-elevate-2",
            )}
          >
            <SettingsIcon
              className={cn("w-4 h-4 flex-shrink-0", showSettings ? "text-accent" : "text-muted")}
            />
            {t("common.settings")}
          </button>
        </aside>

        <main className="flex-1 min-w-0 min-h-0">
          <Workspace
            tray={tray}
            dragging={dragging}
            tool={tool}
            selectedFiles={selectedFiles}
            ignored={tool ? tray.files.length - compatible.length : 0}
            activeId={active?.id ?? null}
            onActivate={setActiveId}
            onClose={() => guard(() => setSelectedId(null))}
            job={job}
            options={options}
            onOptions={onOptions}
            chain={chain}
            onChain={onChain}
          />
        </main>
      </div>

      <UpdatePrompt />

      {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} guard={guard} />}

      {pending && (
        <Modal
          title={t("unsaved.title")}
          description={t("unsaved.body", { count: job.state.outputs.length })}
          onClose={() => setPending(null)}
        >
          <button
            type="button"
            onClick={() => setPending(null)}
            className={BTN_SECONDARY}
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
            className={cn(BTN_SECONDARY, "border-transparent text-muted hover:text-fg")}
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
            className={BTN_PRIMARY}
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
      <UpdaterProvider>
        <PreviewProvider>
          <AppShell />
        </PreviewProvider>
      </UpdaterProvider>
    </SettingsProvider>
  );
}
