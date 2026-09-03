import { Type } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Row } from "@/components/ui/Row";
import { Toggle } from "@/components/ui/Toggle";
import { PageSelector } from "@/components/PageSelector";
import { resolvePages } from "@/components/tools/PdfToImagesTool";
import { runPerFile, sharedPageCount } from "@/components/tools/batch";
import { extractText } from "@/lib/pdf/text";
import { ensureExtension, stem } from "@/lib/format";
import { ToolError } from "@/lib/toolError";
import type { OptionsProps, ToolDefinition } from "@/components/tools/types";

interface Options {
  pages: string;
  pageMarkers: boolean;
}

function ExtractTextOptionsPanel({ value, onChange, files }: OptionsProps<Options>) {
  const { t } = useTranslation();
  return (
    <>
      <PageSelector
        label={t("options.pages")}
        value={value.pages}
        onChange={(pages) => onChange({ pages })}
        file={files[0]}
        pageCount={sharedPageCount(files)}
      />

      <Row label={t("options.pageMarkers")}>
        <Toggle
          checked={value.pageMarkers}
          onChange={(pageMarkers) => onChange({ pageMarkers })}
          label={t("options.pageMarkers")}
        />
      </Row>
    </>
  );
}

export const extractTextTool: ToolDefinition<Options> = {
  id: "extract-text",
  icon: Type,
  accept: "pdf",
  multiple: true,
  handlesEncrypted: true,
  defaults: { pages: "", pageMarkers: true },
  Options: ExtractTextOptionsPanel,
  preview: (outputs) => {
    const text = new TextDecoder().decode(outputs[0]?.bytes ?? new Uint8Array());
    return text.length > 4000 ? `${text.slice(0, 4000)}…` : text;
  },
  run: ({ files, options, passwordFor, onProgress }) =>
    runPerFile(files, onProgress, async (file, progress) => {
      const text = await extractText(
        file,
        {
          pages: resolvePages(options.pages, file.pageCount ?? Number.MAX_SAFE_INTEGER),
          pageMarkers: options.pageMarkers,
          password: passwordFor(file),
        },
        progress,
      );
      // A scan has no text layer at all; saying so beats handing back an empty
      // file and letting the user wonder what went wrong.
      const stripped = text.replace(/--- Page \d+ ---/g, "").trim();
      if (stripped === "") throw new ToolError("errors.noText");
      return [
        {
          name: ensureExtension(stem(file.name), "txt"),
          bytes: new TextEncoder().encode(text),
          mime: "text/plain",
        },
      ];
    }),
};
