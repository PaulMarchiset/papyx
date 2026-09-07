/** Every tool the app exposes; also the key used for i18n and routing. */
export type ToolId =
  | "images-to-pdf"
  | "merge"
  | "split"
  | "organize"
  | "pdf-to-images"
  | "convert-images"
  | "compress"
  | "watermark"
  | "page-numbers"
  | "extract-text"
  | "metadata";

/**
 * A file the user handed to a tool. `bytes` is the whole file held in memory —
 * these are local documents opened one at a time, and keeping them resident is
 * what lets a tool re-run with different options without touching the disk
 * again. `path` is null whenever the file arrived by drag and drop, and in the
 * browser fallback where the picker only yields File objects — only the native
 * picker reports a path (see services/fileSystem.ts).
 */
export interface SourceFile {
  id: string;
  name: string;
  path: string | null;
  size: number;
  bytes: Uint8Array;
  kind: "pdf" | "image";
  /** Filled in lazily for PDFs once the document has been probed. */
  pageCount?: number;
  /** True when the PDF is password-protected and could not be opened. */
  locked?: boolean;
}

export interface OutputFile {
  name: string;
  bytes: Uint8Array;
  mime: string;
}

export type JobStatus = "running" | "done" | "error";

export interface Job {
  id: string;
  toolId: ToolId;
  /** Short human label, e.g. "rapport.pdf → 12 images". */
  label: string;
  status: JobStatus;
  /** 0..1, or null while the total amount of work is unknown. */
  progress: number | null;
  outputs: OutputFile[];
  /** Total input size, for the before/after line on the result card. */
  inputSize: number;
  error: string | null;
  startedAt: number;
  finishedAt: number | null;
  /** Directory or file path once the user has saved the outputs. */
  savedTo: string | null;
}

export type Theme = "system" | "dark" | "light";

export interface Settings {
  theme: Theme;
  language: "system" | "fr" | "en";
  /** When set, outputs are written straight here instead of prompting. */
  outputDir: string | null;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  language: "system",
  outputDir: null,
};
