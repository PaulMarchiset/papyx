import { useEffect } from "react";
import { stem } from "@/lib/format";
import type { SourceFile } from "@/lib/types";

interface Named {
  outputName: string;
  autoName: boolean;
}

/**
 * Keeps the output name in step with the first loaded file — "photos.jpg" gives
 * "photos.pdf", not a generic "document.pdf" — until the user types a name of
 * their own, at which point `autoName` goes false and this stops touching it.
 *
 * The effect settles after one pass: once the field already holds the derived
 * name there is nothing left to write.
 */
export function useDefaultOutputName(
  files: SourceFile[],
  derive: (stem: string) => string,
  value: Named,
  onChange: (patch: Partial<Named>) => void,
): void {
  const first = files[0]?.name;
  const derived = first ? derive(stem(first)) : "";

  useEffect(() => {
    if (!value.autoName || derived === "" || value.outputName === derived) return;
    onChange({ outputName: derived });
  }, [derived, value.autoName, value.outputName, onChange]);
}
