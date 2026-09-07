import { Scissors } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Row } from "@/components/ui/Row";
import { Select } from "@/components/ui/Select";
import { NumberField } from "@/components/ui/Field";
import { Collapse } from "@/components/ui/Collapse";
import { PageSelector } from "@/components/PageSelector";
import { splitPdf, type SplitMode } from "@/lib/pdf/split";
import { parsePageRanges } from "@/lib/pageRanges";
import { ToolError } from "@/lib/toolError";
import type { OptionsProps, ToolDefinition } from "@/components/tools/types";

type Mode = "ranges" | "every" | "each" | "extract";

interface Options {
  mode: Mode;
  /** Comma-separated ranges; one output per comma-separated item in "ranges". */
  ranges: string;
  every: number;
}

function SplitOptionsPanel({ value, onChange, files }: OptionsProps<Options>) {
  const { t } = useTranslation();
  const pageCount = files[0]?.pageCount ?? 1;

  return (
    <>
      <Row label={t("options.mode")}>
        <Select
          value={value.mode}
          options={[
            { value: "ranges", label: t("options.modeRanges") },
            { value: "every", label: t("options.modeEvery") },
            { value: "each", label: t("options.modeEach") },
            { value: "extract", label: t("options.modeExtract") },
          ]}
          onChange={(mode) => onChange({ mode })}
        />
      </Row>

      {/* The two mode-specific blocks trade places: one grows while the other
          shrinks, so nothing below them jumps. */}
      <Collapse open={value.mode === "ranges" || value.mode === "extract"}>
        <PageSelector
          label={t("options.ranges")}
          value={value.ranges}
          onChange={(ranges) => onChange({ ranges })}
          file={files[0]}
          pageCount={pageCount}
          allowAll={false}
        />
      </Collapse>

      <Collapse open={value.mode === "every"}>
        <Row label={t("options.every")}>
          <NumberField
            value={value.every}
            min={1}
            max={Math.max(1, pageCount)}
            onChange={(every) => onChange({ every })}
          />
        </Row>
      </Collapse>
    </>
  );
}

/**
 * "Ranges" makes one file per comma-separated item, so `1-3, 8` yields two
 * documents; "extract" folds the same expression into a single document. That
 * distinction is the whole difference between the two modes.
 */
function toSplitMode(options: Options, pageCount: number): SplitMode {
  if (options.mode === "every") return { kind: "every", size: options.every };
  if (options.mode === "each") return { kind: "each" };

  const items = options.ranges.split(",").map((item) => item.trim()).filter(Boolean);
  if (items.length === 0) throw new ToolError("errors.empty");

  const groups = items.map((item) => {
    const parsed = parsePageRanges(item, pageCount);
    if (parsed.error === "out-of-bounds") {
      throw new ToolError("errors.outOfBounds", { count: pageCount });
    }
    if (parsed.error) throw new ToolError("errors.syntax");
    return parsed.pages;
  });

  return options.mode === "extract"
    ? { kind: "extract", pages: groups.flat() }
    : { kind: "ranges", groups };
}

export const splitTool: ToolDefinition<Options> = {
  id: "split",
  icon: Scissors,
  accept: "pdf",
  multiple: false,
  defaults: { mode: "ranges", ranges: "", every: 1 },
  Options: SplitOptionsPanel,
  run: async ({ files, options, onProgress }) => {
    const file = files[0];
    if (!file) throw new ToolError("errors.noFiles");
    if (file.locked) throw new ToolError("errors.encrypted");
    return splitPdf(file, toSplitMode(options, file.pageCount ?? 1), onProgress);
  },
};
