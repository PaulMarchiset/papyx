import { Stamp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Row } from "@/components/ui/Row";
import { Select } from "@/components/ui/Select";
import { ColorField, NumberField, Slider, TextField } from "@/components/ui/Field";
import { PageSelector } from "@/components/PageSelector";
import { resolvePages } from "@/components/tools/PdfToImagesTool";
import { runPerFile, sharedPageCount } from "@/components/tools/batch";
import { DEFAULT_WATERMARK, watermarkPdf, type WatermarkOptions } from "@/lib/pdf/stamp";
import { ensureExtension, stem } from "@/lib/format";
import { ToolError } from "@/lib/toolError";
import type { OptionsProps, ToolDefinition } from "@/components/tools/types";

interface Options extends Omit<WatermarkOptions, "pages"> {
  pages: string;
}

function WatermarkOptionsPanel({ value, onChange, files }: OptionsProps<Options>) {
  const { t } = useTranslation();
  return (
    <>
      <Row label={t("options.text")}>
        <TextField
          value={value.text}
          onChange={(text) => onChange({ text })}
          className="w-56"
        />
      </Row>

      <Row label={t("options.layout")}>
        <Select
          value={value.layout}
          options={[
            { value: "center", label: t("options.layoutCenter") },
            { value: "tile", label: t("options.layoutTile") },
            { value: "top-left", label: t("options.topLeft") },
            { value: "top-right", label: t("options.topRight") },
            { value: "bottom-left", label: t("options.bottomLeft") },
            { value: "bottom-right", label: t("options.bottomRight") },
          ]}
          onChange={(layout) => onChange({ layout: layout as Options["layout"] })}
        />
      </Row>

      <Row label={t("options.fontSize")}>
        <NumberField
          value={value.fontSize}
          min={6}
          max={200}
          onChange={(fontSize) => onChange({ fontSize })}
        />
      </Row>

      <Row label={t("options.opacity")}>
        <Slider
          value={Math.round(value.opacity * 100)}
          min={5}
          max={100}
          step={5}
          format={(v) => `${v}%`}
          onChange={(opacity) => onChange({ opacity: opacity / 100 })}
        />
      </Row>

      <Row label={t("options.angle")}>
        <Slider
          value={value.angle}
          min={-90}
          max={90}
          step={5}
          format={(v) => `${v}°`}
          onChange={(angle) => onChange({ angle })}
        />
      </Row>

      <Row label={t("options.color")}>
        <ColorField value={value.color} onChange={(color) => onChange({ color })} />
      </Row>

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

export const watermarkTool: ToolDefinition<Options> = {
  id: "watermark",
  icon: Stamp,
  accept: "pdf",
  multiple: true,
  presets: [
    {
      id: "confidential",
      label: "presets.watermarkConfidential",
      patch: { layout: "center", angle: 45, opacity: 0.25, fontSize: 48 },
    },
    {
      id: "draft",
      label: "presets.watermarkDraft",
      patch: { layout: "tile", angle: 30, opacity: 0.12, fontSize: 28 },
    },
    {
      id: "discreet",
      label: "presets.watermarkDiscreet",
      patch: { layout: "bottom-right", angle: 0, opacity: 0.5, fontSize: 10 },
    },
  ],
  defaults: { ...DEFAULT_WATERMARK, pages: "" },
  Options: WatermarkOptionsPanel,
  run: ({ files, options, onProgress }) => {
    if (options.text.trim() === "") throw new ToolError("errors.emptyText");
    return runPerFile(files, onProgress, async (file, progress) => {
      if (file.locked) throw new ToolError("errors.encrypted");
      const bytes = await watermarkPdf(
        file,
        { ...options, pages: resolvePages(options.pages, file.pageCount ?? 1) },
        progress,
      );
      return [
        {
          name: ensureExtension(`${stem(file.name)}_filigrane`, "pdf"),
          bytes,
          mime: "application/pdf",
        },
      ];
    });
  },
};
