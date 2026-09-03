/**
 * An expected failure with a translation key attached, e.g. a bad page range or
 * a missing password. Anything else that escapes a tool is a bug and surfaces
 * through the generic error message instead.
 */
export class ToolError extends Error {
  constructor(
    public readonly key: string,
    public readonly params: Record<string, unknown> = {},
  ) {
    super(key);
    this.name = "ToolError";
  }
}
