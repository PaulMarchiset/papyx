import { DocumentsPanel } from "@/components/DocumentsPanel";
import { ToolPanel } from "@/components/ToolPanel";
import type { AnyTool } from "@/components/tools/registry";
import type { ChainTarget } from "@/components/ResultCard";
import type { FileTrayState } from "@/lib/useSourceFiles";
import type { Job } from "@/lib/useJob";
import type { SourceFile, ToolId } from "@/lib/types";

interface Props {
  tray: FileTrayState;
  dragging: boolean;
  /** The tool whose panel is open, if any. */
  tool: AnyTool | undefined;
  /** Files the open tool will act on. */
  selectedFiles: SourceFile[];
  /** Files in the tray the open tool cannot read. */
  ignored: number;
  activeId: string | null;
  onActivate: (id: string) => void;
  onClose: () => void;
  job: Job;
  options: Record<string, unknown>;
  onOptions: (patch: Record<string, unknown>) => void;
  chain: ChainTarget[];
  onChain: (id: ToolId) => void;
}

/**
 * The work, as two cards of the window's full height: the documents, then
 * what to do to them.
 *
 * Neither card ever appears, disappears or changes size — only what is inside
 * them does. That is the whole layout's one rule, and it is what lets every
 * remaining movement be small and local (a row sliding in, a drop area easing
 * down, a result growing above the button) instead of the page re-flowing
 * around the user. The window scrolls nowhere; each card scrolls its own
 * content.
 *
 * The tool card gets a little more than half: it holds rows of label and
 * control, page grids and the result, where the documents card holds a list.
 */
export function Workspace({
  tray,
  dragging,
  tool,
  selectedFiles,
  ignored,
  activeId,
  onActivate,
  onClose,
  job,
  options,
  onOptions,
  chain,
  onChain,
}: Props) {
  return (
    <div className="h-full min-h-0 grid gap-5 grid-cols-[minmax(250px,1fr)_minmax(380px,1.15fr)]">
      <DocumentsPanel
        tray={tray}
        dragging={dragging}
        tool={tool}
        activeId={activeId}
        onActivate={onActivate}
      />
      <ToolPanel
        tool={tool}
        files={selectedFiles}
        hasFiles={tray.files.length > 0}
        passwords={tray.passwords}
        ignored={ignored}
        job={job}
        options={options}
        onOptions={onOptions}
        chain={chain}
        onChain={onChain}
        onClose={onClose}
      />
    </div>
  );
}
