import { Replace } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Row } from "@/components/ui/Row";
import { Select } from "@/components/ui/Select";
import { Slider } from "@/components/ui/Field";
import { Collapse } from "@/components/ui/Collapse";
import {
  DEFAULT_CONVERT_IMAGES,
  convertImages,
  type ConvertImagesOptions,
} from "@/lib/pdf/convertImages";
import { ToolError } from "@/lib/toolError";
import type { OptionsProps, ToolDefinition } from "@/components/tools/types";

type Options = ConvertImagesOptions;

function ConvertImagesOptionsPanel({ value, onChange }: OptionsProps<Options>) {
  const { t } = useTranslation();

  return (
    <>
      <Row label={t("options.format")}>
        <Select
          value={value.format}
          options={[
            { value: "jpeg", label: "JPG" },
            { value: "png", label: "PNG" },
            { value: "webp", label: "WebP" },
          ]}
          onChange={(format) => onChange({ format })}
        />
      </Row>

      {/* Lossless PNG has no quality to set. The row grows in and out rather
          than appearing, so switching preset moves what is under it. */}
      <Collapse open={value.format !== "png"}>
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
      </Collapse>
    </>
  );
}

export const convertImagesTool: ToolDefinition<Options> = {
  id: "convert-images",
  icon: Replace,
  accept: "image",
  multiple: true,
  showsDelta: true,
  defaults: DEFAULT_CONVERT_IMAGES,
  Options: ConvertImagesOptionsPanel,
  run: async ({ files, options, onProgress }) => {
    if (files.length === 0) throw new ToolError("errors.noFiles");
    return convertImages(files, options, onProgress);
  },
};
