import { useCallback, useRef, useState } from "react";
import type { ToolId } from "@/lib/types";

const STORAGE_KEY = "papyx.options";

type OptionBag = Record<string, unknown>;

function load(): Record<string, OptionBag> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Per-tool options, kept across tool switches and across sessions.
 *
 * Someone stamping the same watermark on ten documents should type it once, so
 * the last-used settings are the defaults next time. Stored values are merged
 * *over* the tool's defaults, which means a new option added later still gets
 * its default instead of coming back undefined.
 */
export function useToolOptions() {
  const [stored, setStored] = useState<Record<string, OptionBag>>(load);
  // Written through a ref as well so a burst of patches in one tick doesn't
  // persist a stale snapshot.
  const latest = useRef(stored);

  const persist = useCallback((next: Record<string, OptionBag>) => {
    latest.current = next;
    setStored(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // A full or disabled storage costs the memory of the last run, nothing more.
    }
  }, []);

  const optionsFor = useCallback(
    (id: ToolId, defaults: OptionBag): OptionBag => ({ ...defaults, ...stored[id] }),
    [stored],
  );

  const patch = useCallback(
    (id: ToolId, defaults: OptionBag, changes: OptionBag) => {
      const current = { ...defaults, ...latest.current[id] };
      persist({ ...latest.current, [id]: { ...current, ...changes } });
    },
    [persist],
  );

  /** Drops one tool's memory, restoring its defaults. */
  const resetTool = useCallback(
    (id: ToolId) => {
      const next = { ...latest.current };
      delete next[id];
      persist(next);
    },
    [persist],
  );

  return { optionsFor, patch, resetTool };
}
