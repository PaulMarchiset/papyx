import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile } from "@tauri-apps/plugin-fs";
import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener";
import { join } from "@tauri-apps/api/path";
import { isTauri } from "@/lib/platform";
import { basename } from "@/lib/format";
import type { OutputFile } from "@/lib/types";

/**
 * The one seam between the app and the machine it runs on.
 *
 * Under Tauri these are native dialogs and real disk writes. In a plain browser
 * (`npm run dev`, no Rust build) the same calls fall back to an <input
 * type=file> and downloads, so every screen is exercisable without booting the
 * desktop shell. Nothing here ever talks to the network — that is the whole
 * point of the app.
 */

export interface PickedFile {
  name: string;
  /** Absolute path under Tauri; null in the browser fallback. */
  path: string | null;
  bytes: Uint8Array;
}

export interface FileFilter {
  name: string;
  extensions: string[];
}

export const PDF_FILTER: FileFilter = { name: "PDF", extensions: ["pdf"] };
export const IMAGE_FILTER: FileFilter = {
  name: "Images",
  extensions: ["png", "jpg", "jpeg", "webp", "avif", "gif", "bmp", "tif", "tiff"],
};

function acceptAttribute(filters: FileFilter[]): string {
  return filters.flatMap((f) => f.extensions.map((e) => `.${e}`)).join(",");
}

async function pickViaInput(filters: FileFilter[], multiple: boolean): Promise<PickedFile[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = acceptAttribute(filters);
    input.multiple = multiple;
    // A cancelled picker fires no event at all in most browsers, so the promise
    // is settled from whichever of the two paths happens first.
    const done = (files: PickedFile[]) => {
      input.remove();
      resolve(files);
    };
    input.addEventListener("change", async () => {
      const files = Array.from(input.files ?? []);
      done(
        await Promise.all(
          files.map(async (file) => ({
            name: file.name,
            path: null,
            bytes: new Uint8Array(await file.arrayBuffer()),
          })),
        ),
      );
    });
    input.addEventListener("cancel", () => done([]));
    input.click();
  });
}

export async function pickFiles(
  filters: FileFilter[],
  multiple = true,
): Promise<PickedFile[]> {
  if (!isTauri) return pickViaInput(filters, multiple);

  const selection = await openDialog({ multiple, filters });
  const paths = Array.isArray(selection) ? selection : selection ? [selection] : [];
  return Promise.all(
    paths.map(async (path) => ({
      name: basename(path),
      path,
      bytes: await readFile(path),
    })),
  );
}

/** Re-reads a file the app already knows the path of (used by "reload"). */
export async function readPath(path: string): Promise<Uint8Array> {
  return readFile(path);
}

export async function pickDirectory(title?: string): Promise<string | null> {
  if (!isTauri) return null;
  // Without a title the OS dialog just says "Select Folder", which is thin
  // guidance when it opened because a run produced twelve images.
  const selection = await openDialog({ directory: true, multiple: false, title });
  return typeof selection === "string" ? selection : null;
}

function download(file: OutputFile) {
  const blob = new Blob([file.bytes as BlobPart], { type: file.mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  // Revoking immediately can race the download in Chromium; a tick is enough.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Writes one output. Returns the path it landed on, or null if the user backed
 * out. In the browser it always "succeeds" as a download and returns null,
 * because there is no path to show.
 */
export async function saveOutput(
  file: OutputFile,
  directory: string | null,
): Promise<string | null> {
  if (!isTauri) {
    download(file);
    return null;
  }
  const extension = file.name.split(".").pop() ?? "";
  const target = directory
    ? await join(directory, file.name)
    : await saveDialog({
        defaultPath: file.name,
        filters: [{ name: extension.toUpperCase(), extensions: [extension] }],
      });
  if (!target) return null;
  await writeFile(target, file.bytes);
  return target;
}

/**
 * Writes a whole result set. With several outputs the user picks a folder once
 * instead of answering one dialog per file.
 */
export async function saveOutputs(
  files: OutputFile[],
  directory: string | null,
  folderPrompt?: string,
): Promise<string | null> {
  if (files.length === 0) return null;
  if (!isTauri) {
    for (const file of files) download(file);
    return null;
  }
  if (files.length === 1) return saveOutput(files[0], directory);

  const target = directory ?? (await pickDirectory(folderPrompt));
  if (!target) return null;
  for (const file of files) {
    await writeFile(await join(target, file.name), file.bytes);
  }
  return target;
}

export async function reveal(path: string): Promise<void> {
  if (!isTauri) return;
  await revealItemInDir(path);
}

export async function openInSystem(path: string): Promise<void> {
  if (!isTauri) return;
  await openPath(path);
}
