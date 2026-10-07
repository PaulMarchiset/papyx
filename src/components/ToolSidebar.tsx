import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { TOOL_GROUPS, findTool } from "@/components/tools/registry";
import { cn } from "@/lib/cn";
import type { SourceFile, ToolId } from "@/lib/types";

interface Props {
  /** What is in the tray; tools that cannot take any of it are disabled. */
  files: SourceFile[];
  selected: ToolId | null;
  onSelect: (id: ToolId) => void;
}

/**
 * Every tool, always in the same place, in the website's three families.
 *
 * This replaced a grid that changed shape when a tool was opened — three big
 * cards and a block of chips folding into a different block of chips — which
 * moved every tool on screen at the moment you were trying to pick one. A list
 * that never rearranges is the opposite: the eye learns where things are once.
 *
 * The selection is a single lifted surface that slides from the old tool to
 * the new one rather than blinking off here and on there, so a change of tool
 * reads as one movement.
 */
export function ToolSidebar({ files, selected, onSelect }: Props) {
  const { t } = useTranslation();
  const list = useRef<HTMLDivElement>(null);
  const [marker, setMarker] = useState<{ top: number; height: number } | null>(null);

  // With an empty tray every tool is available; once documents are waiting, a
  // tool that cannot read them is shown but disabled — the list becomes an
  // answer to "what can I do with these" rather than a menu of dead ends.
  const kinds = new Set(files.map((file) => file.kind));
  const usable = (accept: string) => kinds.size === 0 || kinds.has(accept as SourceFile["kind"]);

  useLayoutEffect(() => {
    const root = list.current;
    if (!root) return;
    const measure = () => {
      const button = selected
        ? root.querySelector<HTMLElement>(`[data-tool="${selected}"]`)
        : null;
      // offsetTop is against the list itself: it is the nearest positioned
      // ancestor, which is why the sections must not be.
      setMarker(button ? { top: button.offsetTop, height: button.offsetHeight } : null);
    };
    measure();
    // Rows change height when the bundled font lands or the language changes.
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [selected]);

  return (
    <nav
      aria-label={t("tools.title")}
      className="h-full overflow-y-auto pr-1 -mr-1"
    >
      <div ref={list} className="relative space-y-5 pb-4">
        {/* The selection, drawn once and moved. data-motion marks it as a
            thing that is meant to travel (see the motion test). */}
        <span
          aria-hidden="true"
          data-motion
          className={cn(
            "absolute left-0 right-0 top-0 rounded-xl bg-surface shadow-card",
            "transition-[transform,height,opacity] duration-[360ms]",
            marker ? "opacity-100" : "opacity-0",
          )}
          style={{
            transform: `translateY(${marker?.top ?? 0}px)`,
            height: marker?.height ?? 0,
          }}
        />

        {TOOL_GROUPS.map((group) => (
          <section key={group.id}>
            <h2 className="px-3 pb-2 text-xs font-semibold text-muted">
              {t(`tools.groups.${group.id}`)}
            </h2>
            <ul className="space-y-0.5">
              {group.tools.map((id) => {
                const tool = findTool(id);
                if (!tool) return null;
                const Icon = tool.icon;
                const enabled = usable(tool.accept);
                const active = id === selected;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      data-tool={id}
                      disabled={!enabled}
                      aria-pressed={active}
                      onClick={() => onSelect(id)}
                      title={enabled ? t(`tools.${id}.desc`) : t(`tools.needs.${tool.accept}`)}
                      className={cn(
                        "relative w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left",
                        "transition-colors",
                        active
                          ? "text-fg"
                          : enabled
                            ? "text-subtle hover:text-fg hover:bg-elevate-2"
                            : "text-muted opacity-45 cursor-not-allowed",
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-4 h-4 flex-shrink-0 transition-colors",
                          active ? "text-accent" : "text-muted",
                        )}
                      />
                      <span className="text-sm truncate">{t(`tools.${id}.name`)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </nav>
  );
}
