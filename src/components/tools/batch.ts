import { subProgress, type ProgressCallback } from "@/lib/pdf/progress";
import { ToolError } from "@/lib/toolError";
import type { OutputFile, SourceFile } from "@/lib/types";

/**
 * Applies a per-document operation to every file in the tray.
 *
 * Compressing twenty scans is the same gesture as compressing one, so the tools
 * that transform a document in place take the whole tray rather than making the
 * user come back nineteen times. Progress is stitched into a single 0→100 run
 * (see subProgress) instead of restarting per file.
 */
export async function runPerFile(
  files: SourceFile[],
  onProgress: ProgressCallback,
  each: (file: SourceFile, onProgress: ProgressCallback) => Promise<OutputFile[]>,
): Promise<OutputFile[]> {
  if (files.length === 0) throw new ToolError("errors.noFiles");
  const outputs: OutputFile[] = [];
  for (const [index, file] of files.entries()) {
    outputs.push(...(await each(file, subProgress(onProgress, index, files.length))));
  }
  return outputs;
}

/**
 * The page count a page-range field should validate against for a batch: the
 * shortest document, so an accepted range is one every file can honour.
 */
export function sharedPageCount(files: SourceFile[]): number {
  const counts = files.map((file) => file.pageCount ?? 0).filter((count) => count > 0);
  return counts.length === 0 ? 1 : Math.min(...counts);
}
