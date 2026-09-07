import { MIME, canvasToBytes, extensionFor, type ImageFormat } from "@/lib/pdf/canvas";
import { decodeToCanvas } from "@/lib/pdf/images";
import type { ProgressCallback } from "@/lib/pdf/progress";
import { stem } from "@/lib/format";
import { ToolError } from "@/lib/toolError";
import type { OutputFile } from "@/lib/types";

/**
 * Image → image conversion.
 *
 * Every input is decoded and re-encoded, so it is lossy by definition; reach is
 * the point, not fidelity. The case that justifies the tool is HEIC, which a
 * phone produces and almost nothing else opens (see heif.ts) — the other
 * formats come along because the decoder is the same one.
 */

export interface ConvertImagesOptions {
  format: ImageFormat;
  /** 0..1, ignored for PNG. */
  quality: number;
}

export const DEFAULT_CONVERT_IMAGES: ConvertImagesOptions = {
  format: "jpeg",
  quality: 0.9,
};

/**
 * Output names for a batch, kept distinct: converting IMG_0042.heic next to
 * IMG_0042.png would otherwise produce one name twice, and saving to a folder
 * would let the second file quietly overwrite the first.
 */
export function outputNames(names: string[], format: ImageFormat): string[] {
  const extension = extensionFor(format);
  const taken = new Set<string>();
  return names.map((name) => {
    const base = stem(name);
    let candidate = `${base}.${extension}`;
    for (let n = 2; taken.has(candidate.toLowerCase()); n++) {
      candidate = `${base}-${n}.${extension}`;
    }
    taken.add(candidate.toLowerCase());
    return candidate;
  });
}

export async function convertImages(
  files: { name: string; bytes: Uint8Array }[],
  options: ConvertImagesOptions,
  onProgress?: ProgressCallback,
): Promise<OutputFile[]> {
  const names = outputNames(
    files.map((file) => file.name),
    options.format,
  );
  const outputs: OutputFile[] = [];

  for (const [index, file] of files.entries()) {
    let canvas: HTMLCanvasElement;
    try {
      canvas = await decodeToCanvas(file.bytes);
    } catch {
      // Naming the file matters here: a tray of forty photos with one truncated
      // download in it is otherwise a guessing game. Nothing that can throw
      // Cancelled runs inside this try.
      throw new ToolError("errors.decode", { name: file.name });
    }
    outputs.push({
      name: names[index],
      bytes: await canvasToBytes(
        canvas,
        MIME[options.format],
        options.format === "png" ? undefined : options.quality,
      ),
      mime: MIME[options.format],
    });
    await onProgress?.(index + 1, files.length);
  }
  return outputs;
}
