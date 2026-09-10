/**
 * The version shown in Settings.
 *
 * One of four places the version appears — the others are package.json,
 * src-tauri/Cargo.toml and src-tauri/tauri.conf.json. Move them together with
 * `npm run set-version 1.2.3`; version.test.ts fails the build if they drift,
 * which matters because tauri.conf.json's copy is what the updater compares
 * against the release manifest.
 */
export const APP_VERSION = "1.0.0";
