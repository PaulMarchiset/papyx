#!/usr/bin/env node
/**
 * Sets the app version in the four places it appears.
 *
 * It was a chore before the updater and it is a trap after it: the version the
 * updater compares against the release manifest is the one in
 * `src-tauri/tauri.conf.json`, so a bump that misses that file ships an app
 * that offers everyone an update it has already installed — over and over. The
 * four files are kept honest by `src/lib/version.test.ts`; this is what makes
 * keeping them honest a single command.
 *
 *   npm run set-version 1.1.0
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const version = process.argv[2];

if (!/^\d+\.\d+\.\d+$/.test(version ?? "")) {
  console.error("usage: npm run set-version <major.minor.patch>");
  process.exit(1);
}

/** Replaces the first match of `pattern`, failing loudly if there isn't one. */
function edit(relative, pattern, replacement) {
  const path = join(root, relative);
  const before = readFileSync(path, "utf8");
  const after = before.replace(pattern, replacement);
  if (after === before) {
    console.error(`could not find the version line in ${relative}`);
    process.exit(1);
  }
  writeFileSync(path, after);
  console.log(`  ${relative}`);
}

console.log(`Papyx ${version}`);
edit("package.json", /("version":\s*)"[^"]+"/, `$1"${version}"`);
edit("src-tauri/tauri.conf.json", /("version":\s*)"[^"]+"/, `$1"${version}"`);
// Only the [package] version — the dependency versions below it must not move.
edit("src-tauri/Cargo.toml", /(\[package\][\s\S]*?\nversion = )"[^"]+"/, `$1"${version}"`);
edit("src/lib/version.ts", /(APP_VERSION = )"[^"]+"/, `$1"${version}"`);
// Cargo.lock carries the crate's own version too; cargo rewrites it on the next
// build, but doing it here keeps the tree clean straight after a bump.
edit(
  "src-tauri/Cargo.lock",
  /(name = "papyx"\nversion = )"[^"]+"/,
  `$1"${version}"`,
);

console.log("\nNext: commit, then `git tag v" + version + " && git push origin v" + version + "`.");
