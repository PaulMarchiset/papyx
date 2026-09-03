import { useEffect } from "react";
import { Tags } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Row } from "@/components/ui/Row";
import { TextField } from "@/components/ui/Field";
import { EMPTY_METADATA, readMetadata, writeMetadata } from "@/lib/pdf/metadata";
import { ensureExtension, stem } from "@/lib/format";
import { ToolError } from "@/lib/toolError";
import type { OptionsProps, ToolDefinition } from "@/components/tools/types";

interface Options {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
  createdOn: string | null;
  modifiedOn: string | null;
  /** Id of the file the fields were read from, so a new file reloads them. */
  loadedFor: string | null;
}

const DEFAULTS: Options = {
  ...EMPTY_METADATA,
  createdOn: null,
  modifiedOn: null,
  loadedFor: null,
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.valueOf()) ? "—" : date.toLocaleString();
}

function MetadataOptionsPanel({ value, onChange, files }: OptionsProps<Options>) {
  const { t } = useTranslation();
  const file = files[0];

  // The fields are an editing buffer seeded from the document, so they are
  // refilled whenever a different file lands in the tray.
  useEffect(() => {
    if (!file || file.locked || value.loadedFor === file.id) return;
    let cancelled = false;
    readMetadata(file).then((metadata) => {
      if (cancelled) return;
      onChange({
        ...metadata,
        createdOn: metadata.creationDate,
        modifiedOn: metadata.modificationDate,
        loadedFor: file.id,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [file, value.loadedFor, onChange]);

  const fields: { key: keyof Options; label: string }[] = [
    { key: "title", label: t("options.title") },
    { key: "author", label: t("options.author") },
    { key: "subject", label: t("options.subject") },
    { key: "keywords", label: t("options.keywords") },
    { key: "creator", label: t("options.creator") },
    { key: "producer", label: t("options.producer") },
  ];

  return (
    <>
      {fields.map((field) => (
        <Row key={field.key} label={field.label}>
          <TextField
            value={String(value[field.key] ?? "")}
            onChange={(next) => onChange({ [field.key]: next } as Partial<Options>)}
            className="w-72"
          />
        </Row>
      ))}

      <Row label={t("options.createdOn")}>
        <span className="text-sm text-muted">{formatDate(value.createdOn)}</span>
      </Row>
      <Row label={t("options.modifiedOn")}>
        <span className="text-sm text-muted">{formatDate(value.modifiedOn)}</span>
      </Row>
    </>
  );
}

export const metadataTool: ToolDefinition<Options> = {
  id: "metadata",
  icon: Tags,
  accept: "pdf",
  multiple: false,
  runLabel: "common.apply",
  defaults: DEFAULTS,
  Options: MetadataOptionsPanel,
  run: async ({ files, options }) => {
    const file = files[0];
    if (!file) throw new ToolError("errors.noFiles");
    if (file.locked) throw new ToolError("errors.encrypted");
    const bytes = await writeMetadata(file, {
      title: options.title,
      author: options.author,
      subject: options.subject,
      keywords: options.keywords,
      creator: options.creator,
      producer: options.producer,
      creationDate: options.createdOn,
      modificationDate: options.modifiedOn,
    });
    return [
      {
        name: ensureExtension(`${stem(file.name)}_metadonnees`, "pdf"),
        bytes,
        mime: "application/pdf",
      },
    ];
  },
};
