import { useCallback, useState } from "react";
import { readPageCount } from "@/lib/pdf/document";
import { IMAGE_EXTENSIONS } from "@/lib/pdf/images";
import { extension } from "@/lib/format";
import {
  pickFiles,
  IMAGE_FILTER,
  PDF_FILTER,
  type PickedFile,
} from "@/lib/services/fileSystem";
import { reorder } from "@/lib/reorder";
import type { SourceFile } from "@/lib/types";

export type AcceptKind = "pdf" | "image";

let counter = 0;

function classify(name: string): AcceptKind | null {
  const ext = extension(name);
  if (ext === "pdf") return "pdf";
  return IMAGE_EXTENSIONS.includes(ext) ? "image" : null;
}

/**
 * The file tray, owned by the app shell rather than by a tool screen: files
 * loaded once stay loaded while the user moves between tools, so picking the
 * wrong tool costs a click instead of a reload. Each tool takes the subset it
 * accepts (see ToolScreen).
 *
 * PDFs are probed on arrival for their page count, which doubles as the
 * encryption check — pdf-lib refuses encrypted files, and a tool needs to know
 * that before it offers options measured in pages.
 */
export function useSourceFiles() {
  const [files, setFiles] = useState<SourceFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);
  /** Passwords the user typed for locked files, keyed by file id. */
  const [passwords, setPasswords] = useState<Record<string, string>>({});

  const add = useCallback(async (picked: PickedFile[]) => {
    setLoading(true);
    setRejected([]);
    try {
      const kept: SourceFile[] = [];
      const skipped: string[] = [];

      for (const file of picked) {
        const kind = classify(file.name);
        if (kind === null) {
          skipped.push(file.name);
          continue;
        }
        const source: SourceFile = {
          id: `f${++counter}`,
          name: file.name,
          path: file.path,
          size: file.bytes.byteLength,
          bytes: file.bytes,
          kind,
        };
        if (kind === "pdf") {
          try {
            source.pageCount = await readPageCount(file.bytes);
          } catch (error) {
            // Encrypted files still belong in the tray: the render-based tools
            // can open them once the user supplies a password.
            source.locked = error instanceof Error && /encrypted/i.test(error.message);
            if (!source.locked) {
              skipped.push(file.name);
              continue;
            }
          }
        }
        kept.push(source);
      }

      setRejected(skipped);
      setFiles((current) => [...current, ...kept]);
      return kept;
    } finally {
      setLoading(false);
    }
  }, []);

  /** Opens the native picker filtered to `accept`. */
  const browse = useCallback(
    async (accept: AcceptKind) => {
      const picked = await pickFiles([accept === "pdf" ? PDF_FILTER : IMAGE_FILTER], true);
      if (picked.length > 0) await add(picked);
    },
    [add],
  );

  /** Opens the picker with no kind filter — the home screen takes anything. */
  const browseAny = useCallback(async () => {
    const picked = await pickFiles([PDF_FILTER, IMAGE_FILTER], true);
    if (picked.length > 0) await add(picked);
  }, [add]);

  /** Replaces the whole tray — used when a result is chained into a tool. */
  const replace = useCallback(async (picked: PickedFile[]) => {
    setFiles([]);
    setPasswords({});
    return add(picked);
  }, [add]);

  const remove = useCallback((id: string) => {
    setFiles((current) => current.filter((file) => file.id !== id));
  }, []);

  const clear = useCallback(() => {
    setFiles([]);
    setPasswords({});
    setRejected([]);
  }, []);

  /** Drag-and-drop reordering: move the row at `from` to `to`. */
  const moveTo = useCallback((from: number, to: number) => {
    setFiles((current) => reorder(current, from, to));
  }, []);

  const setPassword = useCallback((id: string, password: string) => {
    setPasswords((current) => ({ ...current, [id]: password }));
  }, []);

  return {
    files,
    loading,
    rejected,
    passwords,
    add,
    browse,
    browseAny,
    replace,
    remove,
    clear,
    moveTo,
    setPassword,
  };
}

export type FileTrayState = ReturnType<typeof useSourceFiles>;
