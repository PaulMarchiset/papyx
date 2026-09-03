import { useTranslation } from "react-i18next";
import { FileDropZone } from "@/components/FileDropZone";
import { FileTray } from "@/components/FileTray";
import { AddMoreButton } from "@/components/AddMoreButton";
import { ToolGrid } from "@/components/ToolGrid";
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
  onSelect: (id: ToolId) => void;
  onClose: () => void;
  job: Job;
  options: Record<string, unknown>;
  onOptions: (patch: Record<string, unknown>) => void;
  chain: ChainTarget[];
  onChain: (id: ToolId) => void;
}

/**
 * The whole app, on one page: documents at the top, the tool grid under them,
 * and the chosen tool's settings in place below.
 *
 * Both orders work — pick a tool and feed it, or drop the files first and let
 * the grid grey out what cannot read them — and neither costs a screen change,
 * so the documents never leave your sight while you decide what to do to them.
 */
export function Home({
  tray,
  dragging,
  tool,
  selectedFiles,
  ignored,
  activeId,
  onActivate,
  onSelect,
  onClose,
  job,
  options,
  onOptions,
  chain,
  onChain,
}: Props) {
  const { t } = useTranslation();
  const hasFiles = tray.files.length > 0;
  const single = tool != null && !tool.multiple;

  return (
    <div className="space-y-6">
      {/* The hero introduces the app; once a tool is open it is just a header
          taking the room the settings need. */}
      {!tool && (
        <div className="pt-6 pb-2">
          <h1 className="font-serif text-3xl text-fg leading-tight">{t("home.tagline")}</h1>
          <p className="text-sm text-muted mt-3 max-w-xl leading-relaxed">
            {t("home.subtitle")}
          </p>
        </div>
      )}

      {hasFiles ? (
        <div className="space-y-3">
          <FileTray
            files={tray.files}
            reorderable={Boolean(tool?.reorderable)}
            loading={tray.loading}
            passwords={tray.passwords}
            activeId={single ? activeId : null}
            onActivate={single ? onActivate : undefined}
            onAdd={tray.browseAny}
            onRemove={tray.remove}
            onMoveTo={tray.moveTo}
            onPassword={tray.setPassword}
          />
          <AddMoreButton multiple onClick={tray.browseAny} />
        </div>
      ) : (
        <FileDropZone
          kind={tool?.accept ?? "any"}
          multiple
          dragging={dragging}
          loading={tray.loading}
          onClick={tray.browseAny}
        />
      )}

      {tray.rejected.length > 0 && (
        <p className="text-sm text-red-400">
          {tray.rejected.map((name) => t("files.unsupported", { name })).join(" ")}
        </p>
      )}

      <ToolGrid files={tray.files} selected={tool?.id ?? null} onSelect={onSelect} />

      {tool && (
        <ToolPanel
          key={tool.id}
          tool={tool}
          files={selectedFiles}
          passwords={tray.passwords}
          ignored={ignored}
          job={job}
          options={options}
          onOptions={onOptions}
          chain={chain}
          onChain={onChain}
          onClose={onClose}
        />
      )}
    </div>
  );
}
