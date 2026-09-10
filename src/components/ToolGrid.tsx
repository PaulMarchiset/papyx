import { useTranslation } from "react-i18next";
import { TOOLS } from "@/components/tools/registry";
import { CARD, TILE } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import type { SourceFile, ToolId } from "@/lib/types";

interface Props {
  /** What is in the tray; tools that cannot take any of it are disabled. */
  files: SourceFile[];
  selected: ToolId | null;
  onSelect: (id: ToolId) => void;
}

/**
 * The three tools people reach for first, then everything else.
 *
 * A flat grid of ten equals makes the common case cost the same as the rare
 * one. These three carry most of the traffic, so they get the room until a tool
 * is chosen — at which point the whole grid collapses to a row of chips, so the
 * choice stays one click away without pushing the settings off screen.
 */
const FEATURED: ToolId[] = ["images-to-pdf", "merge", "compress"];

export function ToolGrid({ files, selected, onSelect }: Props) {
  const { t } = useTranslation();

  // With an empty tray every tool is available; once documents are waiting, a
  // tool that cannot read them is shown but disabled — the grid becomes an
  // answer to "what can I do with these" rather than a menu of dead ends.
  const kinds = new Set(files.map((file) => file.kind));
  const usable = (accept: string) => kinds.size === 0 || kinds.has(accept as SourceFile["kind"]);

  if (selected) {
    return (
      <div
        key="chips"
        className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2"
      >
        {TOOLS.map((tool) => (
          <Chip
            key={tool.id}
            tool={tool}
            selected={tool.id === selected}
            enabled={usable(tool.accept)}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  }

  return (
    <div key="cards" className="space-y-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        {FEATURED.map((id) => TOOLS.find((tool) => tool.id === id)!).map((tool) => {
          const Icon = tool.icon;
          const enabled = usable(tool.accept);
          return (
            <button
              key={tool.id}
              type="button"
              disabled={!enabled}
              onClick={() => onSelect(tool.id)}
              title={enabled ? undefined : t(`tools.needs.${tool.accept}`)}
              className={cn(
                CARD,
                "group text-left px-5 py-6 border border-transparent transition-colors",
                enabled ? "hover:border-border-hover" : "opacity-40 cursor-not-allowed",
              )}
            >
              <span
                className={cn(
                  TILE,
                  "w-12 h-12 mb-4 transition-colors",
                  enabled
                    ? "bg-accent/15 text-accent group-hover:bg-accent group-hover:text-white"
                    : "bg-elevate-3 text-muted",
                )}
              >
                <Icon className="w-5 h-5" />
              </span>
              <div className="text-base font-medium text-fg">{t(`tools.${tool.id}.name`)}</div>
              <p className="text-sm text-muted mt-1 leading-snug">
                {t(`tools.${tool.id}.desc`)}
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
        {TOOLS.filter((tool) => !FEATURED.includes(tool.id)).map((tool) => (
          <Chip
            key={tool.id}
            tool={tool}
            selected={false}
            enabled={usable(tool.accept)}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function Chip({
  tool,
  selected,
  enabled,
  onSelect,
}: {
  tool: (typeof TOOLS)[number];
  selected: boolean;
  enabled: boolean;
  onSelect: (id: ToolId) => void;
}) {
  const { t } = useTranslation();
  const Icon = tool.icon;
  return (
    <button
      type="button"
      disabled={!enabled}
      aria-pressed={selected}
      onClick={() => onSelect(tool.id)}
      title={enabled ? t(`tools.${tool.id}.desc`) : t(`tools.needs.${tool.accept}`)}
      className={cn(
        "flex items-center gap-3 rounded-2xl px-4 py-3 border transition-colors",
        selected
          ? "bg-accent/10 border-accent/60"
          : enabled
            ? "bg-surface border-transparent shadow-card hover:border-border-hover"
            : "bg-surface border-transparent opacity-40 cursor-not-allowed",
      )}
    >
      <Icon
        className={cn(
          "w-4 h-4 flex-shrink-0",
          selected ? "text-accent" : enabled ? "text-subtle" : "text-muted",
        )}
      />
      <span className="text-sm text-fg truncate">{t(`tools.${tool.id}.name`)}</span>
    </button>
  );
}
