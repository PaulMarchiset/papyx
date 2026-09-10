import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_VERSION } from "./version";

/**
 * The version lives in four files, and since the updater it is load-bearing:
 * the plugin compares the manifest against the version in tauri.conf.json, so a
 * bump that misses that file ships an app that keeps offering an update it has
 * already installed. `npm run set-version` moves all four together — this is
 * what notices when someone edits one by hand.
 */
const root = join(__dirname, "..", "..");
const read = (relative: string) => readFileSync(join(root, relative), "utf8");

describe("app version", () => {
  it("is the same in all four places", () => {
    const pkg = JSON.parse(read("package.json")).version;
    const tauri = JSON.parse(read("src-tauri/tauri.conf.json")).version;
    const cargo = read("src-tauri/Cargo.toml").match(/\[package\][\s\S]*?\nversion = "([^"]+)"/)?.[1];

    expect(pkg).toBe(APP_VERSION);
    expect(tauri).toBe(APP_VERSION);
    expect(cargo).toBe(APP_VERSION);
  });

  it("is a plain semver triple, which is what the updater compares", () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
