import { imagesToPdfTool } from "@/components/tools/ImagesToPdfTool";
import { mergeTool } from "@/components/tools/MergeTool";
import { splitTool } from "@/components/tools/SplitTool";
import { organizeTool } from "@/components/tools/OrganizeTool";
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

/** Order here is the order of the home grid. */
export const TOOLS: AnyTool[] = [
  imagesToPdfTool,
  mergeTool,
  splitTool,
  organizeTool,
  pdfToImagesTool,
  convertImagesTool,
  compressTool,
  watermarkTool,
  pageNumbersTool,
  extractTextTool,
  metadataTool,
];

export function findTool(id: ToolId): AnyTool | undefined {
  return TOOLS.find((tool) => tool.id === id);
}
