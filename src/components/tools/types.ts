import type { LucideIcon } from "lucide-react";
import type { Preset } from "@/components/PresetRow";
import type { ProgressCallback } from "@/lib/pdf/progress";
import type { AcceptKind } from "@/lib/useSourceFiles";
import type { OutputFile, SourceFile, ToolId } from "@/lib/types";

export interface RunContext<O> {
  files: SourceFile[];
  options: O;
  /** Password the user typed for a locked file, if any. */
  passwordFor: (file: SourceFile) => string | undefined;
  onProgress: ProgressCallback;
}

export interface OptionsProps<O> {
  value: O;
  /** Patch-style setter; tools never replace the whole options object. */
  onChange: (patch: Partial<O>) => void;
  files: SourceFile[];
}

export interface ToolDefinition<O> {
  id: ToolId;
  icon: LucideIcon;
  accept: AcceptKind;
  /** Whether the tool consumes several inputs at once. */
  multiple: boolean;
  /** True when input order changes the result (merge, images→PDF). */
  reorderable?: boolean;
  /**
   * True when the tool works through pdf.js and can therefore open a
   * password-protected file; the structural (pdf-lib) tools cannot.
   */
  handlesEncrypted?: boolean;
  /** Named starting points shown above the options. */
  presets?: Preset[];
  /** Translation key overriding the "Lancer" label — metadata applies. */
  runLabel?: string;
  defaults: O;
  Options: (props: OptionsProps<O>) => React.ReactNode;
  run: (context: RunContext<O>) => Promise<OutputFile[]>;
  /** Report the output size against the input size on the result card. */
  showsDelta?: boolean;
  /** Result preview, e.g. the first lines of extracted text. */
  preview?: (outputs: OutputFile[]) => string | undefined;
}
