# Papyx — agent notes

Tauri 2 desktop PDF toolbox. React 19 + Vite 7 + Tailwind v4 frontend in `src/`;
a deliberately thin Rust shell in `src-tauri/`. Sibling project to FFkit — same
stack, same design tokens, different domain.

## Build & test commands

| Command | What it does |
|---|---|
| `npm run build` | `tsc --noEmit` then `vite build`. Authoritative type check (covers `src/`, `tests/` and the config files). |
| `npm run test:unit` | Vitest — the PDF operations against real generated documents, in Node. |
| `npm run test:e2e` | Playwright — full flows in Chromium against the dev server. |
| `npm run dev` | Vite only: the app runs in a plain browser with web fallbacks. |
| `npm run tauri dev` / `npm run tauri build` | Full desktop app (slow the first time — cold Rust build). |

## Where the work happens

All PDF processing is frontend code. Three engines, and the split matters:

- **pdf-lib** (`src/lib/pdf/{document,merge,split,organize,imagesToPdf,stamp,metadata}.ts`)
  for structural edits. Non-destructive: text stays text.
- **pdf.js** (`src/lib/pdf/{pdfjs,rasterize,text}.ts`) for anything needing a
  rendered page. Destructive by nature — `compressPdf` rasterizes.
- **libheif-js** (`src/lib/pdf/heif.ts`) for HEIC only, behind a dynamic import.
  Canvas encoding is shared by the two image paths in `canvas.ts`; `images.ts`
  owns `decodeToCanvas`, which is what makes HEIC work everywhere at once
  (convert, images→PDF, watermark, tray previews) rather than in one tool.

Adding a tool means adding one operation under `src/lib/pdf/`, one definition
under `src/components/tools/` implementing `ToolDefinition`, and one entry in
`registry.ts`. `ToolScreen` supplies the file tray, progress, errors and saving;
a tool only declares its options and its `run`.

## Shape of the app

There is one screen. `Home` holds the file tray, the tool grid and — under it,
in place — the open tool's `ToolPanel`; choosing a tool never navigates, it
opens a panel, and the grid collapses to a row of chips so switching stays one
click. Settings is the only other view.

The state all of that reads lives in `App.tsx`: the tray (`useSourceFiles`),
the open tool, the running job (`useJob`) and per-tool options
(`useToolOptions`, persisted to localStorage). Everything below is a view over
it, which is what lets the tool change without the documents going anywhere and
lets the shell notice you are walking away from an unsaved result.

Consequences worth knowing:

- A tool takes the subset of the tray matching its `accept`. `multiple: true`
  means the whole subset is processed in one run (see `tools/batch.ts`);
  `multiple: false` turns the tray into a picker and the tool acts on the
  active row.
- Changing files *or* options resets the result — a card under stale settings is
  worse than no card. Navigation away from an unsaved one is guarded by a prompt.
- With a fixed output folder set, `useJob` saves as soon as a run succeeds; the
  result card is then a report, not a to-do.
- Cancellation rides the progress callback: `useJob` throws `Cancelled` from it
  and the page loop unwinds. Operations must therefore `await onProgress(...)`
  and never swallow around it.

## Motion

Nothing animates its way into existence. A panel, a card, a menu or a dialog is
simply there when it opens, and changing tool or view plays nothing — the app
had a rise-and-fade entrance on all of them and it read as the interface
re-arriving on every click. What is left moves for a reason: the layout, a 2%
press dip on every button, and the indeterminate progress sweep.

Conditional options are the layout case, and they go through `ui/Collapse`
instead of `{condition && <Row/>}` — the quality row, the page grid, the output
folder. Inserting a row moved everything under it in one frame; the component
gives the row itself the height (`grid-template-rows: 0fr -> 1fr`, the one way
to interpolate a content-sized box) so its neighbours travel. Two details are
load-bearing: a closed Collapse renders `null` rather than a zero-height box,
because `space-y` margins go by position in the DOM and an empty box still
hands its neighbour a gap; and the content is clipped only while moving, or a
`Select` menu inside one would be cut off.

Everything that does move shares `--ease-soft`, a cubic ease-out that keeps
travelling for most of its duration — the sharper expo/quint curves put nine
tenths of the distance in the first fifth of the time and read as a snap. It is
also set as Tailwind v4's `--default-transition-duration` /
`--default-transition-timing-function`, so hovers and colour changes soften with
it instead of running on their own 150ms default.

Two cascade traps are already paid for and easy to reintroduce: the press rule
lives **outside** `@layer base` as `button:not(:disabled)`, because a utility
like `transition-colors` sets `transition-property` on the element and would
drop the transform; and the `prefers-reduced-motion` block is unlayered and
last, because layered rules lose to the unlayered utilities they are trying to
override. All of the above is covered by e2e tests — including that a click
leaves nothing mid-entrance.

## Things that will bite

- **pdf.js detaches the buffer it is given.** `openDocument` copies the bytes for
  that reason — a `SourceFile` is reused across runs and must stay readable.
- **Progress callbacks are awaited on purpose.** Everything runs on the UI
  thread, so `useJob` yields a macrotask inside the callback; a plain
  fire-and-forget callback would freeze the bar at 0 until the job ended. See
  `src/lib/pdf/progress.ts`.
- **`public/pdfjs/` is generated**, by `scripts/sync-pdfjs-assets.mjs` on
  postinstall. It is git-ignored. Without it, CJK documents and PDFs relying on
  the 14 standard fonts render blank.
- **HEIC needs `'wasm-unsafe-eval'` in the CSP.** Chromium ships no HEVC
  decoder, so libheif is compiled to wasm — and the production `script-src`
  would otherwise block instantiating it, silently, in the built app only.
  Note also that AVIF lives in the same ISO-BMFF container and declares `mif1`
  among its brands: `isHeif` excludes it on purpose, because the browser
  decodes AVIF natively and better. There is a test for that.
- **Helvetica is WinAnsi-encoded.** `toWinAnsi` folds typographic strays before
  pdf-lib throws on them; do not remove it when touching the stamping tools.
- **`dragDropEnabled: false` is deliberate.** On Windows, letting Tauri handle
  drops takes over the whole drag pipeline and kills the HTML5 drag-and-drop API
  inside the page — which reordering files and pages depends on. Drops therefore
  arrive as ordinary `DataTransfer` files and carry no path; only the native
  picker yields one. Turning it back on silently breaks reordering.
- **The e2e specs assume French.** The app follows the browser locale, so
  `playwright.config.ts` pins `locale: "fr-FR"`.
- **CSP is set in `tauri.conf.json`**, with a looser `devCsp` because the React
  refresh preamble is injected inline in dev. If a build renders blank while dev
  works, suspect the production CSP first.

## Icons

`app-icon.svg` is the source artwork. `npm run gen:icon` rasterises it to
`app-icon.png` (1024²) through Playwright's Chromium — already installed for the
e2e suite, and the only renderer here that draws real curves — then
`npx tauri icon app-icon.png` fans it into `src-tauri/icons/`.

Regenerating the icons does **not** invalidate the Rust build: cargo does not
watch `icons/`, so the exe keeps embedding the old `icon.ico` (which is the
taskbar and window icon on Windows). `touch src-tauri/build.rs` before rebuilding.

The in-app lockup is `components/icons/PapyxLogo.tsx`: the same artwork with
`currentColor` instead of the source file's white, so it follows the theme.
