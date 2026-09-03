import { FileImage } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Row } from "@/components/ui/Row";
import { Select } from "@/components/ui/Select";
import { Slider } from "@/components/ui/Field";
import { PageSelector } from "@/components/PageSelector";
import { runPerFile, sharedPageCount } from "@/components/tools/batch";
import { DEFAULT_PDF_TO_IMAGES, pdfToImages, type ImageFormat } from "@/lib/pdf/rasterize";
import { parsePageRanges } from "@/lib/pageRanges";
import { ToolError } from "@/lib/toolError";
import type { OptionsProps, ToolDefinition } from "@/components/tools/types";

interface Options {
  format: ImageFormat;
  dpi: number;
  quality: number;
  pages: string;
}

function PdfToImagesOptionsPanel({ value, onChange, files }: OptionsProps<Options>) {
  const { t } = useTranslation();

  return (
    <>
      <Row label={t("options.format")}>
        <Select
          value={value.format}
          options={[
            { value: "png", label: "PNG" },
            { value: "jpeg", label: "JPG" },
            { value: "webp", label: "WebP" },
          ]}
          onChange={(format) => onChange({ format })}
        />
      </Row>

      <Row label={t("options.dpi")}>
        <Select
          value={String(value.dpi)}
          options={["72", "150", "300", "600"].map((dpi) => ({ value: dpi, label: dpi }))}
          onChange={(dpi) => onChange({ dpi: Number(dpi) })}
        />
      </Row>

      {value.format !== "png" && (
        <Row label={t("options.quality")}>
          <Slider
            value={Math.round(value.quality * 100)}
            min={30}
            max={100}
            step={5}
            format={(v) => `${v}%`}
            onChange={(quality) => onChange({ quality: quality / 100 })}
          />
        </Row>
      )}

      <PageSelector
        label={t("options.pages")}
        value={value.pages}
        onChange={(pages) => onChange({ pages })}
        file={files[0]}
        pageCount={sharedPageCount(files)}
      />
    </>
  );
}

/** Shared by every tool with an optional page filter: empty means "all". */
export function resolvePages(expression: string, pageCount: number): number[] {
  if (expression.trim() === "") return [];
  const parsed = parsePageRanges(expression, pageCount);
  if (parsed.error === "out-of-bounds") {
    throw new ToolError("errors.outOfBounds", { count: pageCount });
  }
  if (parsed.error) throw new ToolError("errors.syntax");
  return parsed.pages;
}

export const pdfToImagesTool: ToolDefinition<Options> = {
  id: "pdf-to-images",
  icon: FileImage,
  accept: "pdf",
  multiple: true,
  handlesEncrypted: true,
  presets: [
    { id: "screen", label: "presets.rasterScreen", patch: { format: "png", dpi: 72 } },
    { id: "standard", label: "presets.rasterStandard", patch: { format: "png", dpi: 150 } },
    {
      id: "print",
      label: "presets.rasterPrint",
      patch: { format: "jpeg", dpi: 300, quality: 0.92 },
    },
  ],
  defaults: {
    format: DEFAULT_PDF_TO_IMAGES.format,
    dpi: DEFAULT_PDF_TO_IMAGES.dpi,
    quality: DEFAULT_PDF_TO_IMAGES.quality,
    pages: "",
  },
  Options: PdfToImagesOptionsPanel,
  run: ({ files, options, passwordFor, onProgress }) =>
    runPerFile(files, onProgress, (file, progress) =>
      pdfToImages(
        file,
        {
          format: options.format,
          dpi: options.dpi,
          quality: options.quality,
          pages: resolvePages(options.pages, file.pageCount ?? Number.MAX_SAFE_INTEGER),
          password: passwordFor(file),
        },
        progress,
      ),
    ),
};
