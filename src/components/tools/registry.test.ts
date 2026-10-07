import { describe, expect, it } from "vitest";
import { TOOLS, TOOL_GROUPS } from "@/components/tools/registry";

describe("TOOL_GROUPS", () => {
  it("lists every tool exactly once", () => {
    // The sidebar is drawn from the groups, not from TOOLS: a tool registered
    // but left out of a group would exist and be unreachable.
    const grouped = TOOL_GROUPS.flatMap((group) => group.tools);
    expect([...grouped].sort()).toEqual(TOOLS.map((tool) => tool.id).sort());
    expect(new Set(grouped).size).toBe(grouped.length);
  });
});
