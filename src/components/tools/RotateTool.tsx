import { ArrowDownUp, RotateCcw, RotateCw, RotateCwSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Row } from "@/components/ui/Row";
import { Segmented } from "@/components/ui/Segmented";
import { Collapse } from "@/components/ui/Collapse";
import { PageSelector } from "@/components/PageSelector";
import { resolvePages } from "@/components/tools/PdfToImagesTool";
import { runPerFile, sharedPageCount } from "@/components/tools/batch";
import { rotatePdf, type RotateScope, type Turn } from "@/lib/pdf/rotate";
import { ensureExtension, stem } from "@/lib/format";
import { ToolError } from "@/lib/toolError";
import type { OptionsProps, ToolDefinition } from "@/components/tools/types";

type Direction = "right" | "left" | "half";

interface Options {
  direction: Direction;
  scope: RotateScope;
  /** Page-range expression, read when `scope` is "pages". */
  pages: string;
}

const TURNS: Record<Direction, Turn> = { right: 90, left: 270, half: 180 };

/**
 * What the preview shows. Left is -90 rather than 270 so a thumbnail turns
 * a quarter anticlockwise instead of three quarters the other way round.
 */
const PREVIEW: Record<Direction, number> = { right: 90, left: -90, half: 180 };

function RotateOptionsPanel({ value, onChange, files }: OptionsProps<Options>) {
  const { t } = useTranslation();
  const pageCount = sharedPageCount(files);

  return (
    <>
      <Row label={t("rotate.direction")}>
        <Segmented<Direction>
          value={value.direction}
          segments={[
            { value: "right", label: t("rotate.right"), icon: <RotateCw className="w-4 h-4" /> },
            { value: "left", label: t("rotate.left"), icon: <RotateCcw className="w-4 h-4" /> },
            { value: "half", label: t("rotate.half"), icon: <ArrowDownUp className="w-4 h-4" /> },
          ]}
          onChange={(direction) => onChange({ direction })}
        />
      </Row>

      <Row
        label={t("options.pages")}
        description={
          value.scope === "landscape" || value.scope === "portrait"
            ? t(`rotate.${value.scope}Hint`)
            : undefined
        }
      >
        <Segmented<RotateScope>
          value={value.scope}
          segments={[
            { value: "all", label: t("rotate.scopeAll") },
            { value: "landscape", label: t("options.landscape") },
            { value: "portrait", label: t("options.portrait") },
            { value: "pages", label: t("rotate.scopePages") },
          ]}
          onChange={(scope) =>
            // Arriving at a hand-picked selection with nothing picked would
            // leave the grid looking broken; start from every page instead,
            // so the preview shows them all turned and a click takes one out.
            onChange(
              scope === "pages" && value.pages.trim() === ""
                ? { scope, pages: pageCount > 1 ? `1-${pageCount}` : "1" }
                : { scope },
            )
          }
        />
      </Row>

      <Collapse open={value.scope === "pages"}>
        <PageSelector
          label={t("rotate.pick")}
          value={value.pages}
          onChange={(pages) => onChange({ pages })}
          file={files[0]}
          pageCount={pageCount}
          allowAll={false}
          turn={PREVIEW[value.direction]}
        />
      </Collapse>
    </>
  );
}

export const rotateTool: ToolDefinition<Options> = {
  id: "rotate",
  icon: RotateCwSquare,
  accept: "pdf",
  multiple: true,
  defaults: { direction: "right", scope: "all", pages: "" },
  Options: RotateOptionsPanel,
  run: async ({ files, options, onProgress }) => {
    const outputs = await runPerFile(files, onProgress, async (file, progress) => {
      if (file.locked) throw new ToolError("errors.encrypted");
      const pages =
        options.scope === "pages" ? resolvePages(options.pages, file.pageCount ?? 1) : [];
      if (options.scope === "pages" && pages.length === 0) throw new ToolError("errors.empty");
      const { bytes, rotated } = await rotatePdf(
        file,
        { turn: TURNS[options.direction], scope: options.scope, pages },
        progress,
      );
      // A document with nothing to turn — no landscape page in a
      // landscape-only pass — gets no copy of itself in the results.
      if (rotated === 0) return [];
      return [
        {
          name: ensureExtension(`${stem(file.name)}_pivote`, "pdf"),
          bytes,
          mime: "application/pdf",
        },
      ];
    });
    if (outputs.length === 0) throw new ToolError("errors.nothingToRotate");
    return outputs;
  },
};
