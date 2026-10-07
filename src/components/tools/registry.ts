import { imagesToPdfTool } from "@/components/tools/ImagesToPdfTool";
import { mergeTool } from "@/components/tools/MergeTool";
import { splitTool } from "@/components/tools/SplitTool";
import { organizeTool } from "@/components/tools/OrganizeTool";
import { rotateTool } from "@/components/tools/RotateTool";
import { pdfToImagesTool } from "@/components/tools/PdfToImagesTool";
import { convertImagesTool } from "@/components/tools/ConvertImagesTool";
import { compressTool } from "@/components/tools/CompressTool";
import { watermarkTool } from "@/components/tools/WatermarkTool";
import { pageNumbersTool } from "@/components/tools/PageNumbersTool";
import { extractTextTool } from "@/components/tools/ExtractTextTool";
import { metadataTool } from "@/components/tools/MetadataTool";
import type { ToolDefinition } from "@/components/tools/types";
import type { ToolId } from "@/lib/types";

/**
 * Every tool option shape is different, so the registry is deliberately
 * untyped in its parameter: the screen that renders a tool re-establishes the
 * pairing between `Options`, `defaults` and `run` inside one definition, which
 * is where the types actually have to line up.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyTool = ToolDefinition<any>;

/** Every tool. The sidebar's order comes from TOOL_GROUPS below. */
export const TOOLS: AnyTool[] = [
  imagesToPdfTool,
  mergeTool,
  splitTool,
  organizeTool,
  rotateTool,
  pdfToImagesTool,
  convertImagesTool,
  compressTool,
  watermarkTool,
  pageNumbersTool,
  extractTextTool,
  metadataTool,
];

/**
 * The sidebar's three families, in the website's words and order. Eleven-odd
 * tools in one flat list are a list to read; in three groups the question
 * becomes "what kind of thing am I doing", which is answered at a glance.
 */
export const TOOL_GROUPS: { id: "assemble" | "convert" | "annotate"; tools: ToolId[] }[] = [
  { id: "assemble", tools: ["images-to-pdf", "merge", "split", "organize", "rotate"] },
  { id: "convert", tools: ["pdf-to-images", "convert-images", "compress"] },
  { id: "annotate", tools: ["watermark", "page-numbers", "extract-text", "metadata"] },
];

export function findTool(id: ToolId): AnyTool | undefined {
  return TOOLS.find((tool) => tool.id === id);
}
