import { Images, RectangleHorizontal, RectangleVertical, Wand2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Row } from "@/components/ui/Row";
import { Segmented } from "@/components/ui/Segmented";
import { Select } from "@/components/ui/Select";
import { NumberField, TextField } from "@/components/ui/Field";
import {
  DEFAULT_IMAGES_TO_PDF,
  imagesToPdf,
  type ImagesToPdfOptions,
} from "@/lib/pdf/imagesToPdf";
import { ensureExtension } from "@/lib/format";
import { ToolError } from "@/lib/toolError";
import type { Orientation, PageSizeId } from "@/lib/pdf/document";
import { useDefaultOutputName } from "@/components/tools/useDefaultOutputName";
import type { OptionsProps, ToolDefinition } from "@/components/tools/types";

interface Options extends ImagesToPdfOptions {
  outputName: string;
  /** False once the user has typed a name of their own. */
  autoName: boolean;
}

function ImagesToPdfOptionsPanel({ value, onChange, files }: OptionsProps<Options>) {
  const { t } = useTranslation();
  useDefaultOutputName(files, (name) => `${name}.pdf`, value, onChange);
  const sizes: { value: PageSizeId; label: string }[] = [
    { value: "auto", label: t("options.pageSizeAuto") },
    { value: "a4", label: "A4" },
    { value: "a3", label: "A3" },
    { value: "a5", label: "A5" },
    { value: "letter", label: "Letter" },
    { value: "legal", label: "Legal" },
  ];

  return (
    <>
      <Row label={t("options.pageSize")}>
        <Select
          value={value.pageSize}
          options={sizes}
          onChange={(pageSize) => onChange({ pageSize })}
        />
      </Row>

      <Row label={t("options.orientation")}>
        <Segmented<Orientation>
          value={value.orientation}
          segments={[
            {
              value: "auto",
              label: t("options.auto"),
              icon: <Wand2 className="w-4 h-4" />,
            },
            {
              value: "portrait",
              label: t("options.portrait"),
              icon: <RectangleVertical className="w-4 h-4" />,
            },
            {
              value: "landscape",
              label: t("options.landscape"),
              icon: <RectangleHorizontal className="w-4 h-4" />,
            },
          ]}
          onChange={(orientation) => onChange({ orientation })}
        />
      </Row>

      <Row label={t("options.margin")}>
        <NumberField
          value={value.marginMm}
          min={0}
          max={100}
          onChange={(marginMm) => onChange({ marginMm })}
        />
      </Row>

      <Row label={t("options.outputName")}>
        <TextField
          value={value.outputName}
          onChange={(outputName) => onChange({ outputName, autoName: false })}
          placeholder="document.pdf"
          className="w-56"
        />
      </Row>
    </>
  );
}

export const imagesToPdfTool: ToolDefinition<Options> = {
  id: "images-to-pdf",
  icon: Images,
  accept: "image",
  multiple: true,
  reorderable: true,
  presets: [
    {
      id: "a4",
      label: "presets.imagesA4",
      patch: { pageSize: "a4", orientation: "auto", marginMm: 0 },
    },
    {
      id: "a4-margin",
      label: "presets.imagesA4Margin",
      patch: { pageSize: "a4", orientation: "auto", marginMm: 12 },
    },
    {
      id: "fit",
      label: "presets.imagesFit",
      patch: { pageSize: "auto", orientation: "auto", marginMm: 0 },
    },
  ],
  defaults: { ...DEFAULT_IMAGES_TO_PDF, outputName: "", autoName: true },
  Options: ImagesToPdfOptionsPanel,
  run: async ({ files, options, onProgress }) => {
    if (files.length === 0) throw new ToolError("errors.noFiles");
    const bytes = await imagesToPdf(files, options, onProgress);
    return [
      {
        name: ensureExtension(options.outputName, "pdf"),
        bytes,
        mime: "application/pdf",
      },
    ];
  },
};
