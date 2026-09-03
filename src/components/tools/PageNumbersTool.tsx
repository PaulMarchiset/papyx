import { Hash } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Row } from "@/components/ui/Row";
import { Select } from "@/components/ui/Select";
import { ColorField, NumberField, TextField } from "@/components/ui/Field";
import { PageSelector } from "@/components/PageSelector";
import { resolvePages } from "@/components/tools/PdfToImagesTool";
import { runPerFile, sharedPageCount } from "@/components/tools/batch";
import {
  addPageNumbers,
  DEFAULT_PAGE_NUMBERS,
  type Corner,
  type PageNumberOptions,
} from "@/lib/pdf/stamp";
import { ensureExtension, stem } from "@/lib/format";
import { ToolError } from "@/lib/toolError";
import type { OptionsProps, ToolDefinition } from "@/components/tools/types";

interface Options extends Omit<PageNumberOptions, "pages"> {
  pages: string;
}

function PageNumbersOptionsPanel({ value, onChange, files }: OptionsProps<Options>) {
  const { t } = useTranslation();
  const positions: { value: Corner; label: string }[] = [
    { value: "bottom-center", label: t("options.bottomCenter") },
    { value: "bottom-left", label: t("options.bottomLeft") },
    { value: "bottom-right", label: t("options.bottomRight") },
    { value: "top-center", label: t("options.topCenter") },
    { value: "top-left", label: t("options.topLeft") },
    { value: "top-right", label: t("options.topRight") },
  ];

  return (
    <>
      <Row label={t("options.numberFormat")} description="{n} · {total}">
        <TextField
          value={value.format}
          onChange={(format) => onChange({ format })}
          mono
          className="w-56"
        />
      </Row>

      <Row label={t("options.position")}>
        <Select
          value={value.position}
          options={positions}
          onChange={(position) => onChange({ position })}
        />
      </Row>

      <Row label={t("options.fontSize")}>
        <NumberField
          value={value.fontSize}
          min={6}
          max={48}
          onChange={(fontSize) => onChange({ fontSize })}
        />
      </Row>

      <Row label={t("options.margin")}>
        <NumberField
          value={value.marginMm}
          min={0}
          max={50}
          onChange={(marginMm) => onChange({ marginMm })}
        />
      </Row>

      <Row label={t("options.startAt")}>
        <NumberField
          value={value.startAt}
          min={0}
          max={10000}
          onChange={(startAt) => onChange({ startAt })}
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

export const pageNumbersTool: ToolDefinition<Options> = {
  id: "page-numbers",
  icon: Hash,
  accept: "pdf",
  multiple: true,
  presets: [
    {
      id: "of-total",
      label: "presets.numbersOfTotal",
      patch: { format: "{n} / {total}", position: "bottom-center" },
    },
    {
      id: "plain",
      label: "presets.numbersPlain",
      patch: { format: "{n}", position: "bottom-right" },
    },
    {
      id: "wordy",
      label: "presets.numbersWordy",
      patch: { format: "Page {n} sur {total}", position: "bottom-center" },
    },
  ],
  defaults: { ...DEFAULT_PAGE_NUMBERS, pages: "" },
  Options: PageNumbersOptionsPanel,
  run: ({ files, options, onProgress }) =>
    runPerFile(files, onProgress, async (file, progress) => {
      if (file.locked) throw new ToolError("errors.encrypted");
      const bytes = await addPageNumbers(
        file,
        { ...options, pages: resolvePages(options.pages, file.pageCount ?? 1) },
        progress,
      );
      return [
        {
          name: ensureExtension(`${stem(file.name)}_numerote`, "pdf"),
          bytes,
          mime: "application/pdf",
        },
      ];
    }),
};
