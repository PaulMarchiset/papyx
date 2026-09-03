import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  RotateCcw,
  RotateCw,
  Trash2,
  Undo2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageGrid, type PageItem } from "@/components/PageGrid";
import { useThumbnails } from "@/lib/useThumbnails";
import { reorder } from "@/lib/reorder";
import { organizePdf } from "@/lib/pdf/organize";
import { ensureExtension, stem } from "@/lib/format";
import { ToolError } from "@/lib/toolError";
import type { OptionsProps, ToolDefinition } from "@/components/tools/types";

interface Options {
  items: PageItem[];
  /** Id of the file the plan was built for; a different file rebuilds it. */
  loadedFor: string | null;
}

function OrganizePanel({ value, onChange, files }: OptionsProps<Options>) {
  const { t } = useTranslation();
  const file = files[0];
  const { urls, loading } = useThumbnails(file);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!file || value.loadedFor === file.id) return;
    onChange({
      items: Array.from({ length: file.pageCount ?? 0 }, (_, i) => ({
        page: i + 1,
        rotation: 0,
        deleted: false,
      })),
      loadedFor: file.id,
    });
    setSelected(new Set());
  }, [file, value.loadedFor, onChange]);

  const items = value.items;
  const patch = (mutate: (items: PageItem[]) => PageItem[]) =>
    onChange({ items: mutate([...items]) });

  const rotate = (delta: number) =>
    patch((next) =>
      next.map((item) =>
        selected.has(item.page) ? { ...item, rotation: item.rotation + delta } : item,
      ),
    );

  const setDeleted = (deleted: boolean, all = false) =>
    patch((next) =>
      next.map((item) =>
        all || selected.has(item.page) ? { ...item, deleted } : item,
      ),
    );

  /** Shifts the selected pages one slot, keeping their relative order. */
  const shift = (delta: number) =>
    patch((next) => {
      const indices = next
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => selected.has(item.page))
        .map(({ index }) => index);
      // Walking from the leading edge keeps a contiguous block together
      // instead of having its members swap past one another.
      for (const index of delta < 0 ? indices : [...indices].reverse()) {
        const target = index + delta;
        if (target < 0 || target >= next.length) continue;
        if (selected.has(next[target].page)) continue;
        [next[index], next[target]] = [next[target], next[index]];
      }
      return next;
    });

  if (!file) return null;
  if (file.locked) return <p className="text-sm text-muted">{t("files.lockedStructural")}</p>;

  const none = selected.size === 0;
  const remaining = items.filter((item) => !item.deleted).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted mr-2">
          {t("organize.selected", { count: selected.size })} ·{" "}
          {t("organize.remaining", { count: remaining })}
        </span>

        <Chip label={t("organize.selectAll")} onClick={() => setSelected(new Set(items.map((i) => i.page)))} />
        <Chip label={t("organize.selectNone")} onClick={() => setSelected(new Set())} />

        <span className="w-px h-6 bg-border mx-1" />

        <Icon label={t("organize.rotateLeft")} disabled={none} onClick={() => rotate(-90)}>
          <RotateCcw className="w-4 h-4" />
        </Icon>
        <Icon label={t("organize.rotateRight")} disabled={none} onClick={() => rotate(90)}>
          <RotateCw className="w-4 h-4" />
        </Icon>
        <Icon label={t("organize.moveLeft")} disabled={none} onClick={() => shift(-1)}>
          <ChevronLeft className="w-4 h-4" />
        </Icon>
        <Icon label={t("organize.moveRight")} disabled={none} onClick={() => shift(1)}>
          <ChevronRight className="w-4 h-4" />
        </Icon>
        <Icon label={t("organize.delete")} disabled={none} onClick={() => setDeleted(true)}>
          <Trash2 className="w-4 h-4" />
        </Icon>
        <Icon label={t("organize.restore")} onClick={() => setDeleted(false, true)}>
          <Undo2 className="w-4 h-4" />
        </Icon>
      </div>

      <PageGrid
        items={items}
        urls={urls}
        loading={loading}
        selected={selected}
        onReorder={(from, to) => patch((next) => reorder(next, from, to))}
        onToggle={(page) =>
          setSelected((current) => {
            const next = new Set(current);
            if (next.has(page)) next.delete(page);
            else next.add(page);
            return next;
          })
        }
      />
    </div>
  );
}

function Chip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 rounded-md border border-border-strong text-sm text-fg hover:bg-elevate-2 transition-colors"
    >
      {label}
    </button>
  );
}

function Icon({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="p-2 rounded-md border border-border-strong text-fg hover:bg-elevate-2 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
    >
      {children}
    </button>
  );
}

export const organizeTool: ToolDefinition<Options> = {
  id: "organize",
  icon: LayoutGrid,
  accept: "pdf",
  multiple: false,
  defaults: { items: [], loadedFor: null },
  Options: OrganizePanel,
  run: async ({ files, options, onProgress }) => {
    const file = files[0];
    if (!file) throw new ToolError("errors.noFiles");
    if (file.locked) throw new ToolError("errors.encrypted");
    const plan = options.items
      .filter((item) => !item.deleted)
      .map(({ page, rotation }) => ({ page, rotation }));
    if (plan.length === 0) throw new ToolError("errors.empty");
    const bytes = await organizePdf(file, plan, onProgress);
    return [
      {
        name: ensureExtension(`${stem(file.name)}_organise`, "pdf"),
        bytes,
        mime: "application/pdf",
      },
    ];
  },
};
