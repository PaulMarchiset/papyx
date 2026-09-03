/**
 * True when the app runs on macOS. Derived from the webview user-agent (the
 * macOS WKWebView always reports "Macintosh"), so it's synchronous and needs no
 * extra Tauri OS plugin. Used to defer the window chrome to the native macOS
 * traffic lights (see WindowControls in App).
 */
export const isMacOS =
  typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent);

/**
 * True inside the Tauri webview, false when the same bundle is served in a
 * plain browser by `npm run dev`. Every native capability (file dialogs, disk
 * writes, window chrome) is behind this flag with a browser fallback, so the UI
 * is fully exercisable without a Rust build.
 */
export const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
