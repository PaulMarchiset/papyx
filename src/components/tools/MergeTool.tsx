import { Combine } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Row } from "@/components/ui/Row";
import { TextField } from "@/components/ui/Field";
import { mergePdfs } from "@/lib/pdf/merge";
import { ensureExtension } from "@/lib/format";
import { ToolError } from "@/lib/toolError";
import { useDefaultOutputName } from "@/components/tools/useDefaultOutputName";
import type { OptionsProps, ToolDefinition } from "@/components/tools/types";

interface Options {
  outputName: string;
  /** False once the user has typed a name of their own. */
  autoName: boolean;
}

function MergeOptionsPanel({ value, onChange, files }: OptionsProps<Options>) {
  const { t } = useTranslation();
  // Named after the first document rather than a generic "fusion.pdf", with a
  // suffix so the result never lands on top of one of its own inputs.
  useDefaultOutputName(files, (name) => `${name}_fusion.pdf`, value, onChange);
  const total = files.reduce((sum, file) => sum + (file.pageCount ?? 0), 0);

  return (
    <Row
      label={t("options.outputName")}
      description={total > 0 ? t("common.pages", { count: total }) : undefined}
    >
      <TextField
        value={value.outputName}
        onChange={(outputName) => onChange({ outputName, autoName: false })}
        placeholder="fusion.pdf"
        className="w-56"
      />
    </Row>
  );
}

export const mergeTool: ToolDefinition<Options> = {
  id: "merge",
  icon: Combine,
  accept: "pdf",
  multiple: true,
  reorderable: true,
  defaults: { outputName: "", autoName: true },
  Options: MergeOptionsPanel,
  run: async ({ files, options, onProgress }) => {
    if (files.length === 0) throw new ToolError("errors.noFiles");
    if (files.some((file) => file.locked)) throw new ToolError("errors.encrypted");
    const bytes = await mergePdfs(files, onProgress);
    return [
      {
        name: ensureExtension(options.outputName, "pdf"),
        bytes,
        mime: "application/pdf",
      },
    ];
  },
};
