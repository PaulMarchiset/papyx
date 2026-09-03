import { AlertTriangle, Minimize2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Row } from "@/components/ui/Row";
import { Select } from "@/components/ui/Select";
import { Slider } from "@/components/ui/Field";
import { Toggle } from "@/components/ui/Toggle";
import { runPerFile } from "@/components/tools/batch";
import { compressPdf } from "@/lib/pdf/rasterize";
import { ensureExtension, stem } from "@/lib/format";
import type { OptionsProps, ToolDefinition } from "@/components/tools/types";

interface Options {
  dpi: number;
  quality: number;
  grayscale: boolean;
}

function CompressOptionsPanel({ value, onChange }: OptionsProps<Options>) {
  const { t } = useTranslation();
  return (
    <>
      {/* Rasterising is the only operation here that throws information away.
          Saying so next to the controls beats burying it in the tool blurb the
          user read once, three screens ago. */}
      <div className="flex items-start gap-3 rounded-xl bg-elevate-1 px-4 py-3">
        <AlertTriangle className="w-4 h-4 text-badge-fg flex-shrink-0 mt-0.5" />
        <p className="text-sm text-muted leading-relaxed">{t("compress.warning")}</p>
      </div>

      <Row label={t("options.dpi")} description={t("options.dpiHint")}>
        <Select
          value={String(value.dpi)}
          options={["72", "96", "120", "150", "200"].map((dpi) => ({
            value: dpi,
            label: `${dpi} DPI`,
          }))}
          onChange={(dpi) => onChange({ dpi: Number(dpi) })}
        />
      </Row>

      <Row label={t("options.quality")}>
        <Slider
          value={Math.round(value.quality * 100)}
          min={30}
          max={95}
          step={5}
          format={(v) => `${v}%`}
          onChange={(quality) => onChange({ quality: quality / 100 })}
        />
      </Row>

      <Row label={t("options.grayscale")} description={t("options.grayscaleHint")}>
        <Toggle
          checked={value.grayscale}
          onChange={(grayscale) => onChange({ grayscale })}
          label={t("options.grayscale")}
        />
      </Row>
    </>
  );
}

export const compressTool: ToolDefinition<Options> = {
  id: "compress",
  icon: Minimize2,
  accept: "pdf",
  multiple: true,
  handlesEncrypted: true,
  showsDelta: true,
  presets: [
    { id: "light", label: "presets.compressLight", patch: { dpi: 150, quality: 0.82 } },
    { id: "balanced", label: "presets.compressBalanced", patch: { dpi: 120, quality: 0.7 } },
    { id: "strong", label: "presets.compressStrong", patch: { dpi: 96, quality: 0.55 } },
  ],
  defaults: { dpi: 120, quality: 0.7, grayscale: false },
  Options: CompressOptionsPanel,
  run: ({ files, options, passwordFor, onProgress }) =>
    runPerFile(files, onProgress, async (file, progress) => {
      const bytes = await compressPdf(
        file,
        {
          dpi: options.dpi,
          quality: options.quality,
          grayscale: options.grayscale,
          password: passwordFor(file),
        },
        progress,
      );
      return [
        {
          name: ensureExtension(`${stem(file.name)}_compresse`, "pdf"),
          bytes,
          mime: "application/pdf",
        },
      ];
    }),
};
