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
| `npm run set-version 1.2.3` | Moves the version in all four files that carry it. |

## Where the work happens

All PDF processing is frontend code. Three engines, and the split matters:

- **pdf-lib** (`src/lib/pdf/{document,merge,split,organize,imagesToPdf,stamp,metadata}.ts`)
  for structural edits. Non-destructive: text stays text.
- **pdf.js** (`src/lib/pdf/{pdfjs,rasterize,text}.ts`) for anything needing a
  rendered page. Destructive by nature — `compressPdf` rasterizes.
- **Image decoders** for what Chromium cannot read, each behind a dynamic
  import: **libheif-js** for HEIC (`heif.ts`), **libraw-wasm** for camera RAW
  (`raw.ts`), **utif2** for TIFF (`tiff.ts`). Canvas encoding is shared by the
  two image paths in `canvas.ts`; `images.ts` owns `decodeToCanvas`, which is
  what makes a format work everywhere at once (convert, images→PDF, watermark,
  tray previews) rather than in one tool. Formats are recognised by their bytes,
  and most RAWs *are* TIFFs, so the RAW sniff runs first and a "RAW" LibRaw
  refuses falls back to UTIF.

Adding a tool means adding one operation under `src/lib/pdf/`, one definition
under `src/components/tools/` implementing `ToolDefinition`, and one entry in
`registry.ts`. `ToolScreen` supplies the file tray, progress, errors and saving;
a tool only declares its options and its `run`.

## Shape of the app

The title bar is one row: the lockup and the `100% local` badge on the left,
the window's own buttons on the right, running the bar's full height (60 x 76,
a little taller than wide): their glyphs sit on the logo's centre line, and
Close still owns the top-right corner pixel — where Windows users throw the
pointer to close. Both constraints hold; do not trade one for the other (the window opens maximised, and
`tauri-plugin-window-state` remembers it afterwards). Settings and a waiting
update live at the foot of the tool sidebar, bottom-left, which is what keeps
that bar free for the window controls.

Any thumbnail can be enlarged: the file list's preview opens on click, a page
tile through its corner `ZoomButton` or a double-click (its own click selects
it). `Preview.tsx` holds the one viewer, opened through `usePreview()`; it
keeps the pdf.js document open while it is up so paging is a render, and
shows a page with the rotation the tool is about to apply.

The window is a fixed frame and nothing scrolls it. Under the header: the tool
sidebar (`ToolSidebar`, every tool in the website's three families, from
`TOOL_GROUPS` in `registry.ts`), then `Workspace` — two cards of the
window's full height, **Documents** (`DocumentsPanel`) and **the tool**
(`ToolPanel`). Settings is not a view but a dialog over the workspace
(`SettingsDialog`: sections listed on the left, one shown at a time; the
browser fallback lists only those it has content for). Opening it is therefore
not guarded — the result stays where it is — but installing an update from
inside it is.

The one rule the whole layout hangs on: **neither card ever appears, disappears
or changes size — only what is inside them does.** The earlier layouts broke
that everywhere: the drop zone was swapped for a tray when the first file
landed, the tool grid folded from cards into chips when a tool opened, the run
button floated under a panel of variable height and the result fell below the
fold. Concretely:

- The Documents card is the same element empty and full. Its drop area fills it
  when empty and eases down to a strip at its foot once files are in (both are
  `flex-grow` transitions); dragging files over the window grows it back part
  of the way.
- The tool card has three floors that never trade places: heading, options
  (which scroll on their own), and the floor — the result, grown in with
  `Collapse` once there is one, above `ActionBar`. Without a tool it shows a
  three-step guide in the same card.
- `ActionBar` is one full-width primary button that carries the whole run:
  Run, then progress filling the button, then Save (or Open folder once on
  disk), with Cancel / Run again beside it. There is a test that the Save
  button lands exactly where Run was.
- `Row` wraps its control under its label when the tool card is narrow (it
  can be ~380px at the 960px minimum window).

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

## Updates

The app checks GitHub for a newer release on startup and offers to install it.
This is the only network traffic in the whole program — a `GET` for one signed
manifest — and it is the one place the "nothing leaves the machine" line needs
care: the honest claim is about *documents*, and the copy in `settings.aboutLocal`
and the README says exactly that. Do not restore the older, absolute wording.

`services/updater.ts` is the seam, shaped like `fileSystem.ts`: everything is
behind `isTauri` and a dynamic import, so the browser fallback and the Playwright
suite never load the plugin. `updaterContext.tsx` holds the state machine and
fires the one automatic check; `UpdatePrompt` is the launch dialog, `UpdateChip`
is the row at the foot of the sidebar (above Settings) that stays for as long as
a version is waiting — not only after "Later" — and shows install progress,
`UpdateSection` is the Settings half.

To see all of it without publishing a release: `npm run dev` and open
`/?fake-update`. `fakeUpdateRequested()` in `services/updater.ts` serves a
pretend 1.1.0 with a simulated download, and "restart" reloads without the flag.
It is gated on `import.meta.env.DEV`, so a build cannot be talked into it. The
launch check is marked done when its timer *fires*, not when it is scheduled —
under StrictMode the first timer is cleared at once, and marking it early meant
`tauri dev` never checked at all.

Three decisions worth not re-litigating:

- **It interrupts on launch, on purpose.** An update behind a button in Settings
  is an update nobody installs — the same reason nobody updates their drivers.
  The dialog appears 1.5s after mount, before any document is open, which is the
  one moment where interrupting costs nothing.
- **A silent check that fails stays silent.** Offline is not an error worth
  reporting; the app works exactly as well without a network. Only a check the
  user clicked surfaces "up to date" or a failure — hence the `loud` flag in
  `updaterContext`.
- **Installing restarts the app, so it is guarded.** Reaching the dialog from the
  header chip goes through `guard`, the same unsaved-result prompt as everything
  else; the Settings route is already covered because opening Settings is
  guarded too.

## Shape

Everything is cut from one squircle, and it follows the website
(papyx.paulmarchiset.me, source in `../papyx_web`): borderless surfaces lifted
by shadows, squircle buttons rather than pills, and no squint-sized uppercase
labels. The last rule in `styles.css` hands `corner-shape: squircle` to every
element carrying a radius — `[class*="rounded-"]:not([class*="rounded-full"])`
— so a corner is a superellipse wherever the engine can draw one and an
ordinary rounded rectangle where it cannot. What is left on `rounded-full` is
genuinely round (the toggle and its knob, spinners); a superellipse on a 9999px
radius is a lozenge.

Consequences worth knowing:

- **The radius scale is roughly double Tailwind's.** A superellipse corner
  reads tighter than a circular one of the same radius. `--radius-*` in
  `@theme` carries the corrected values; every `rounded-*` utility follows.
- **No borders on anything you press or anything that floats.** Controls are
  filled (`bg-elevate-*`), focus is an accent ring, selection is a ring on a
  picked page. The drop area's dashed outline is the one deliberate exception.
- **The elevation tokens sit outside `@theme` on purpose.** Tailwind would mint
  a `shadow-card` utility with the value inlined, and `--shadow-card` has to
  follow the light/dark flip, which only a `var()` can.

`components/ui/styles.ts` holds what those add up to: `CARD`, `INSET`, `TILE`
and the button family — `BTN_PRIMARY` the one action, `BTN_SECONDARY`
everything else with a label, `BTN_QUIET` the small one, `BTN_ICON` an icon on
its own. Reach for those before writing geometry into a component.

Handles the tests grab, because a class is not a name: the Documents card is
the region named "Documents"; the tool card is `section[data-card]`; its
options are `[data-options]`; the drop area is `[data-drop-area]`; anything
meant to be moving when a tool opens carries `data-motion`.

## Motion

**If something moves, it travels; nothing fades into place.** Opening a tool or
switching view plays nothing — the contents of a card are simply there. But any
displacement is animated, so the interface never jumps:

- `useFlip` (FLIP on Web Animations, transform/opacity only) on the file list
  and the Organize page grid: rows and pages glide when added, removed or
  reordered, and a dropped file slides into the list. `enterOnMount: false`
  keeps a grid that is simply *there* when its panel opens from fading in.
- The drop area and the file list trade space with `flex-grow` transitions,
  and the drop area's two faces cross-fade staggered so they are never legible
  on top of each other.
- The sidebar selection is one lifted surface that slides between tools
  (`data-motion`; the "opens a tool" test exempts it and nothing else).
- Conditional rows, the result and the picker hint grow through `ui/Collapse`
  instead of `{condition && <Row/>}` (`grid-template-rows: 0fr -> 1fr`). A
  closed Collapse renders `null`, because `space-y` margins go by DOM position
  and an empty box still hands its neighbour a gap; the content is clipped
  only while moving, or a `Select` menu inside one would be cut off.

Everything shares `--ease-soft`, a cubic ease-out that keeps travelling for
most of its duration (expo/quint read as a snap). It is also Tailwind v4's
`--default-transition-duration` / `--default-transition-timing-function`, and
`EASE_SOFT` in `useFlip.ts` for the scripted animations.

Two cascade traps are already paid for: the press rule lives **outside**
`@layer base` as `button:not(:disabled)`, because `transition-colors` would
otherwise drop the transform; and the `prefers-reduced-motion` block is
unlayered and last. `useFlip` checks reduced motion itself. All of this is
covered by e2e tests — that the cards do not move when files arrive, that the
drop area is caught mid-travel, that the selection slides, and that a click
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
- **LibRaw transfers the buffer it is given, too.** `decodeRaw` passes a copy
  for the same reason as `openDocument`. The package is built with pthreads but
  runs single-threaded without `SharedArrayBuffer` — do not "fix" that by
  adding COOP/COEP headers; it works as is in the WebView and under the
  production CSP. It must stay in `optimizeDeps.exclude` (it finds its worker
  and wasm through `import.meta.url`), while `utif2` is CommonJS and must stay
  in `optimizeDeps.include`.
- **Rotate edits /Rotate in place; Organize copies pages.** The copy is what
  lets Organize reorder and duplicate, and it drops bookmarks and forms on the
  way. A rotate that went through `organizePdf` would lose them for nothing.
- **Helvetica is WinAnsi-encoded.** `toWinAnsi` folds typographic strays before
  pdf-lib throws on them; do not remove it when touching the stamping tools.
- **`dragDropEnabled: false` is deliberate.** On Windows, letting Tauri handle
  drops takes over the whole drag pipeline and kills the HTML5 drag-and-drop API
  inside the page — which reordering files and pages depends on. Drops therefore
  arrive as ordinary `DataTransfer` files and carry no path; only the native
  picker yields one. Turning it back on silently breaks reordering.
- **The theme is painted before the first render.** `index.html` ships `.dark`,
  so `main.tsx` calls `applyStoredAppearance()` ahead of `createRoot`: left to
  the provider's effect, a light user gets the whole interface cross-fading from
  dark to light on the first frame — every colour transition in the app at once,
  which is the arriving-interface effect everything else here avoids. It is not
  an inline script in `index.html` because that would need a hash carved out of
  the production CSP.
- **The e2e specs assume French.** The app follows the browser locale, so
  `playwright.config.ts` pins `locale: "fr-FR"`.
- **The version lives in four files** — `package.json`, `src-tauri/Cargo.toml`,
  `src-tauri/tauri.conf.json` and `src/lib/version.ts`. Since the updater it is
  load-bearing: the plugin compares the manifest against `tauri.conf.json`'s
  copy, so a bump that misses that file ships an app that offers everyone an
  update it has already installed, forever. `npm run set-version` moves all of
  them; `version.test.ts` fails the build if they drift.
- **The updater needs a signing key at *build* time.** `createUpdaterArtifacts`
  is on, so `npm run tauri build` fails without `TAURI_SIGNING_PRIVATE_KEY`.
  That is the intended failure — an unsigned bundle would be refused by every
  installed copy anyway. The public half lives in `tauri.conf.json`; losing the
  private half means no installed copy can ever be updated again.
- **Release notes are `RELEASE_NOTES.md`, and users read them.** The workflow
  makes that file the release body, which tauri-action also writes into
  `latest.json` as `notes` — the text every installed copy shows in its update
  dialog. Plain text, written for users, updated before each tag.
- **The release must not be a draft or a prerelease.** The manifest is read from
  `/releases/latest/download/latest.json`, and "latest" skips both.
- **The interface font's metrics are overridden, and everything vertical
  depends on it.** Flexbox centres a line box (ascent + descent); the eye
  centres text between cap height and baseline. Those agree only when
  `ascent - descent = cap`. Sirba satisfies it; PP Mori shipped 0.77/0.23
  against a cap of 0.70, which sat every label ~0.08em high in its button and
  left every icon beside one out of line with it — 1px on a chip, 3px on a
  preset. `styles.css` raises the ascent to 93% on all six faces. Do not
  "fix" a label that looks off by padding it or nudging it: that was the old
  answer, it moved icon and label together, and it could never bring the two
  into line. There is an e2e test on the identity.
- **`WindowControls` must never throw.** Every call goes through `onWindow`,
  because `getCurrentWindow()` throws when the runtime is stubbed or the
  handle has gone — and unguarded, in a mount effect, that took the entire
  header down with it rather than just the buttons. The glyphs are drawn with
  `shape-rendering="crispEdges"`: they are 1px strokes, Windows commonly runs
  at 125%, and a half-pixel stroke smears into what looks like a doubled edge.
  The middle button follows the window — maximise or restore — since the app
  now starts maximised.
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

Three files carry the same P and have to be changed together: `app-icon.svg`,
`public/icon.svg` (the browser-tab copy, kept in sync by hand) and
`components/icons/PapyxLogo.tsx`. In the two tiles the glyph is placed by a
transform over the supplied 550-box coordinates rather than retraced, so the
path is byte-identical in all three and diffable against the source artwork.

The in-app lockup is the website's: the P on its white tile (white in both
themes — it is the app icon) beside "Papyx" in the interface's sans. The glyph
sits in its uncropped 550 box, where it is centred, so the tile needs no padding.
Tile and name are centred on each other, which lands true only because of the
PP Mori metric override; there is a test on that.
