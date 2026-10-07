import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

/** Opens the tool whose card carries `name` and uploads the given fixtures. */
async function openToolWithFiles(page: Page, name: RegExp, files: string[]) {
  await page.getByRole("button", { name }).click();
  const chooser = page.waitForEvent("filechooser");
  await page.getByText(/Déposez/).click();
  await (await chooser).setFiles(files);
}

test("home lists every tool", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: /Fusionner/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Numéroter/ })).toBeVisible();
  await page.screenshot({ path: "tests/screenshots/home.png" });
});

test("merges two PDFs and reports the result", async ({ page }) => {
  await page.goto("/");
  await openToolWithFiles(page, /Fusionner/, [
    "tests/fixtures/alpha.pdf",
    "tests/fixtures/beta.pdf",
  ]);

  // Both files land in the tray with their page counts probed by pdf-lib.
  await expect(page.getByText("alpha.pdf")).toBeVisible();
  await expect(page.getByText("3 pages")).toBeVisible();
  await expect(page.getByText("2 pages")).toBeVisible();

  // The output name follows the first document instead of a generic default.
  await expect(page.getByRole("textbox")).toHaveValue("alpha_fusion.pdf");

  await page.getByRole("button", { name: "Lancer" }).click();
  await expect(page.getByText("1 fichier produit")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("alpha_fusion.pdf")).toBeVisible();
  await page.screenshot({ path: "tests/screenshots/merge.png" });
});

test("reorders files by dragging a row", async ({ page }) => {
  await page.goto("/");
  await openToolWithFiles(page, /Fusionner/, [
    "tests/fixtures/alpha.pdf",
    "tests/fixtures/beta.pdf",
  ]);

  const rows = page.getByRole("region", { name: "Documents" }).getByRole("listitem");
  await expect(rows.first()).toContainText("alpha.pdf");
  // Aimed at the top edge: dropping on the upper half of a row inserts before
  // it, and the exact centre already counts as the lower half.
  await rows.nth(1).dragTo(rows.first(), { targetPosition: { x: 40, y: 4 } });

  await expect(rows.first()).toContainText("beta.pdf");
  // The derived name follows the new first document, which is the tell that
  // the merge order really changed and not just the display.
  await expect(page.getByRole("textbox")).toHaveValue("beta_fusion.pdf");
});

test("reorders pages by dragging a thumbnail", async ({ page }) => {
  await page.goto("/");
  await openToolWithFiles(page, /Organiser/, ["tests/fixtures/alpha.pdf"]);
  await expect(page.locator("[data-options] .grid > div img[alt='']")).toHaveCount(3, { timeout: 20_000 });

  const cards = page.locator("[data-options] .grid > div");
  await expect(cards.first()).toContainText("1");
  // Dropping on the left half of a card inserts before it, so aim at the edge.
  // Page 2 rather than 3: the grid scrolls inside the panel now, and a
  // synthetic drag cannot scroll its container mid-gesture the way a real one
  // auto-scrolls.
  await cards.nth(1).dragTo(cards.first(), { targetPosition: { x: 3, y: 40 } });

  // A card keeps its source page number, so page 2 now leads the document.
  await expect(cards.first()).toContainText("2");
});

test("renders page thumbnails in the organize tool", async ({ page }) => {
  await page.goto("/");
  await openToolWithFiles(page, /Organiser/, ["tests/fixtures/alpha.pdf"]);

  // Three thumbnails means the pdf.js worker booted and rendered to canvas.
  // Scoped to the page cards: the file tray carries a preview of its own.
  const thumbnails = page.locator("[data-options] .grid > div img[alt='']");
  await expect(thumbnails).toHaveCount(3, { timeout: 20_000 });
  await page.getByRole("button", { name: "Tout sélectionner" }).click();
  await page.getByRole("button", { name: "Pivoter à droite" }).click();
  await page.getByRole("button", { name: "Lancer" }).click();
  await expect(page.getByText("1 fichier produit")).toBeVisible({ timeout: 20_000 });
  await page.screenshot({ path: "tests/screenshots/organize.png" });
});

test("exports pages as images", async ({ page }) => {
  await page.goto("/");
  await openToolWithFiles(page, /PDF → Images/, ["tests/fixtures/alpha.pdf"]);
  await page.getByRole("button", { name: "Lancer" }).click();
  await expect(page.getByText("3 fichiers produits")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("alpha_1.png")).toBeVisible();
});

test("picks pages by clicking them, and says so when none are picked", async ({ page }) => {
  await page.goto("/");
  await openToolWithFiles(page, /Diviser/, ["tests/fixtures/alpha.pdf"]);

  // Nothing selected yet: the run is refused with a reason, not a crash.
  await page.getByRole("button", { name: "Lancer" }).click();
  await expect(page.getByText(/au moins une page/)).toBeVisible();

  await page.getByRole("button", { name: "Page 1" }).click();
  await page.getByRole("button", { name: "Page 3" }).click({ modifiers: ["Shift"] });
  await expect(page.getByText("3 pages sélectionnées")).toBeVisible();

  await page.getByRole("button", { name: "Lancer" }).click();
  await expect(page.getByText("1 fichier produit")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("alpha_1-3.pdf")).toBeVisible();
  await page.screenshot({ path: "tests/screenshots/split.png" });
});

test("offers every page by default, and a selection on demand", async ({ page }) => {
  await page.goto("/");
  await openToolWithFiles(page, /Extraire le texte/, ["tests/fixtures/alpha.pdf"]);

  // "All pages" is the default, so there is nothing to choose in the common case.
  await expect(page.getByRole("button", { name: "Page 1" })).toHaveCount(0);
  await page.getByRole("radio", { name: "Sélection" }).click();
  await expect(page.getByText("3 pages sélectionnées")).toBeVisible();

  await page.getByRole("button", { name: "Paires", exact: true }).click();
  await expect(page.getByText("1 page sélectionnée")).toBeVisible();
});

test("follows the system dark theme", async ({ page }) => {
  // The default is light now, so following the system is a setting like any
  // other: seed it, then emulate the system that setting defers to.
  await page.addInitScript(() =>
    localStorage.setItem("papyx.settings", JSON.stringify({ theme: "system" })),
  );
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await openToolWithFiles(page, /Filigrane/, ["tests/fixtures/alpha.pdf"]);
  // The watermark text field is prefilled, which also proves the panel mounted.
  await expect(page.getByRole("textbox").first()).toHaveValue("CONFIDENTIEL");
  await page.screenshot({ path: "tests/screenshots/dark.png" });
});

test("shows the save-location choice as two explained options", async ({ page }) => {
  // The save folder only exists under Tauri, so the desktop runtime is faked
  // just enough for the section to render (see lib/platform.ts).
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Réglages" }).click();
  await page.getByRole("button", { name: "Sortie" }).click();

  await page.getByRole("button", { name: /Demander à chaque fois/ }).click();
  await expect(page.getByRole("option", { name: /Dossier fixe/ })).toBeVisible();
  await page.screenshot({ path: "tests/screenshots/settings.png" });
});

test("previews a loaded document in the tray", async ({ page }) => {
  await page.goto("/");
  await openToolWithFiles(page, /Fusionner/, ["tests/fixtures/alpha.pdf"]);
  // The preview is rendered asynchronously and published from a callback that
  // outlives its effect; it used to be dropped whenever the effect re-ran,
  // which under StrictMode is every time. See useFileThumbnails.
  await expect(page.locator('img[src^="data:image/png"]')).toBeVisible({
    timeout: 15_000,
  });
});

test("keeps loaded files when switching tools", async ({ page }) => {
  await page.goto("/");
  await openToolWithFiles(page, /Fusionner/, ["tests/fixtures/alpha.pdf"]);
  await expect(page.getByText("alpha.pdf")).toBeVisible();

  // Switching tool is one click in the sidebar, with no screen change.
  await page.getByRole("button", { name: /Compresser/ }).click();

  await expect(page.getByRole("heading", { name: "Compresser" })).toBeVisible();
  await expect(page.getByText("alpha.pdf")).toBeVisible();
  await expect(page.getByRole("button", { name: "Lancer" })).toBeEnabled();
});

test("disables the tools that cannot read what is loaded", async ({ page }) => {
  await page.goto("/");
  const chooser = page.waitForEvent("filechooser");
  await page.getByText(/Déposez/).click();
  await (await chooser).setFiles(["tests/fixtures/alpha.pdf"]);

  await expect(page.getByRole("button", { name: /Fusionner/ })).toBeEnabled();
  await expect(page.getByRole("button", { name: /Images → PDF/ })).toBeDisabled();
  await page.screenshot({ path: "tests/screenshots/home-loaded.png" });
});

test("warns before leaving a result that was never saved", async ({ page }) => {
  await page.goto("/");
  await openToolWithFiles(page, /Fusionner/, [
    "tests/fixtures/alpha.pdf",
    "tests/fixtures/beta.pdf",
  ]);
  await page.getByRole("button", { name: "Lancer" }).click();
  await expect(page.getByText("1 fichier produit")).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: "Diviser", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Quitter sans enregistrer" }).click();
  // The held-back action goes through once the answer is in.
  await expect(page.getByRole("heading", { name: "Diviser" })).toBeVisible();
});

test("feeds a result straight into the next tool", async ({ page }) => {
  await page.goto("/");
  await openToolWithFiles(page, /Fusionner/, [
    "tests/fixtures/alpha.pdf",
    "tests/fixtures/beta.pdf",
  ]);
  await page.getByRole("button", { name: "Lancer" }).click();
  await expect(page.getByText("1 fichier produit")).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: "Continuer avec Numéroter" }).click();
  // The merged document is now the input, and the originals are gone.
  await expect(page.getByRole("heading", { name: "Numéroter" })).toBeVisible();
  const documents = page.getByRole("region", { name: "Documents" });
  await expect(documents.getByText("alpha_fusion.pdf")).toBeVisible();
  await expect(documents.getByText("beta.pdf")).toHaveCount(0);
});

test("applies a preset to the options", async ({ page }) => {
  await page.goto("/");
  await openToolWithFiles(page, /Compresser/, ["tests/fixtures/alpha.pdf"]);

  await page.getByRole("button", { name: "Fort" }).click();
  await expect(page.getByRole("button", { name: "96 DPI" })).toBeVisible();
  await page.screenshot({ path: "tests/screenshots/compress.png" });
});

test("lets a single-document tool choose which file it works on", async ({ page }) => {
  await page.goto("/");
  await openToolWithFiles(page, /Organiser/, [
    "tests/fixtures/alpha.pdf",
    "tests/fixtures/beta.pdf",
  ]);
  // alpha (3 pages) leads the tray, so it is the subject by default.
  await expect(page.locator("[data-options] .grid > div")).toHaveCount(3, { timeout: 20_000 });

  await page
    .getByRole("region", { name: "Documents" })
    .getByRole("listitem")
    .filter({ hasText: "beta.pdf" })
    .click();
  await expect(page.locator("[data-options] .grid > div")).toHaveCount(2, { timeout: 20_000 });
});

test("says plainly that a result is not on disk yet", async ({ page }) => {
  await page.goto("/");
  await openToolWithFiles(page, /PDF → Images/, ["tests/fixtures/alpha.pdf"]);
  await page.getByRole("button", { name: "Lancer" }).click();
  await expect(page.getByText("3 fichiers produits")).toBeVisible({ timeout: 30_000 });

  await expect(page.getByText("ne sont pas encore enregistrés")).toBeVisible();
  await expect(page.getByText(/dans quel dossier placer les 3 fichiers/)).toBeVisible();
  await page.screenshot({ path: "tests/screenshots/result.png" });
});

test("centres the logo tile on the wordmark", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const delta = await page.evaluate(() => {
    const tile = document.querySelector("[data-logo-tile]")!.getBoundingClientRect();
    const name = document.querySelector("[data-logo-name]")!.getBoundingClientRect();
    // The name's line box centres on its cap height only because of the PP
    // Mori metric override (see the next test), so this is what fails if the
    // two halves of the lockup ever drift apart.
    return Math.abs(tile.top + tile.height / 2 - (name.top + name.height / 2));
  });
  expect(delta).toBeLessThanOrEqual(1);
});

test("centres text on its cap height rather than on the font's own metrics", async ({
  page,
}) => {
  await page.goto("/");
  const sans = await page.evaluate(async () => {
    await document.fonts.ready;
    const ctx = document.createElement("canvas").getContext("2d")!;
    ctx.font = '400 100px "PP Mori"';
    const m = ctx.measureText("H");
    return {
      ascent: m.fontBoundingBoxAscent / 100,
      descent: m.fontBoundingBoxDescent / 100,
      cap: m.actualBoundingBoxAscent / 100,
    };
  });

  // Flexbox centres a line box, which is ascent + descent. The eye centres a
  // line of text between its cap height and its baseline. The two land in the
  // same place only when `ascent - descent === cap`, and PP Mori ships 0.77 /
  // 0.23 against a cap of 0.70 — which put every label in the app about 0.08em
  // above the middle of its button, and left every icon beside one visibly
  // out of line with it. styles.css overrides the ascent to restore the
  // identity; this is what fails if that override is dropped or if the family
  // is ever swapped for one that does not satisfy it.
  expect(sans.ascent - sans.descent).toBeCloseTo(sans.cap, 2);
});

test("opens a tool without animating anything into place", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Fusionner/ }).click();
  await expect(page.getByRole("heading", { name: "Fusionner" })).toBeVisible();

  // The panel's contents are simply there when a tool opens: nothing is
  // mid-entrance a frame after the click that produced it. What *is* allowed
  // to be moving is whatever is marked data-motion — the sidebar's selection,
  // which slides to the new tool on purpose.
  //
  // Colour is excluded, and deliberately so. Softened hovers are the one thing
  // in this app that *should* be mid-transition here: the pointer is still
  // sitting where it clicked, the grid has just collapsed to chips underneath
  // it, and whichever chip now lies under the cursor is fading its border in.
  // An entrance is something moving or fading into place, so those are the
  // properties worth failing on.
  const entrances = await page.evaluate(() =>
    document
      .getAnimations()
      .filter((animation) => animation.playState === "running")
      .filter((animation) => {
        const target = (animation.effect as KeyframeEffect | null)?.target;
        return !(target instanceof Element && target.closest("[data-motion]"));
      })
      .map((animation) =>
        animation instanceof CSSTransition
          ? animation.transitionProperty
          : (animation as CSSAnimation).animationName,
      )
      .filter((property) => /transform|translate|scale|rotate|opacity|filter/.test(property)),
  );
  expect(entrances).toEqual([]);

  // The press dip needs `transform` in the transition, which Tailwind's
  // `transition-colors` would otherwise drop (see styles.css).
  await expect(page.getByRole("button", { name: /Compresser/ })).toHaveCSS(
    "transition-property",
    /transform/,
  );

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await page.getByRole("button", { name: /Fusionner/ }).click();
  // Someone who asked for less movement gets the press dip held still too.
  await expect(page.getByRole("button", { name: /Compresser/ })).toHaveCSS(
    "transform",
    "none",
  );
});

test("opens settings over the workspace, which stays as it was", async ({ page }) => {
  await page.goto("/");
  await openToolWithFiles(page, /Fusionner/, ["tests/fixtures/alpha.pdf"]);

  await page.getByRole("button", { name: "Réglages" }).click();
  const dialog = page.getByRole("dialog", { name: "Réglages" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Apparence" })).toBeVisible();
  await dialog.getByRole("button", { name: "À propos" }).click();
  await expect(dialog.getByRole("heading", { name: "À propos" })).toBeVisible();
  await page.screenshot({ path: "tests/screenshots/settings-dialog.png" });

  // Escape closes it, and nothing behind it moved: same tool, same files.
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Fusionner/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByRole("region", { name: "Documents" }).getByText("alpha.pdf"),
  ).toBeVisible();
});

test("grows a conditional option into place instead of inserting it", async ({ page }) => {
  await page.goto("/");
  await openToolWithFiles(page, /PDF → Images/, ["tests/fixtures/alpha.pdf"]);
  const card = page.locator("[data-options]");
  // The panel is still filling in (page count, thumbnails) for a moment after
  // it opens, so the baseline is whatever height it comes to rest at.
  const settled = async () => {
    let previous = -1;
    for (let i = 0; i < 25; i++) {
      const height = (await card.boundingBox())!.height;
      if (height === previous) return height;
      previous = height;
      await page.waitForTimeout(150);
    }
    return previous;
  };
  const closed = await settled();

  // "Impression" is the JPEG preset, which is what brings the quality row in.
  await page.getByRole("button", { name: "Impression" }).click();
  const samples: number[] = await page.evaluate(async () => {
    const element = document.querySelector("[data-options]") as HTMLElement;
    const heights: number[] = [];
    for (let i = 0; i < 8; i++) {
      heights.push(element.getBoundingClientRect().height);
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    return heights;
  });
  await expect(page.getByText("Qualité")).toBeVisible();
  const open = (await card.boundingBox())!.height;
  expect(open).toBeGreaterThan(closed);
  // The options were caught between their two heights: the row grew rather
  // than being inserted at full size, which is what carries the rows under it.
  expect(samples.some((height) => height > closed && height < open)).toBe(true);

  await page.getByRole("button", { name: "Standard" }).click();
  await expect(page.getByText("Qualité")).toHaveCount(0);
  // Closed, the row leaves nothing behind — a zero-height box would still hand
  // its neighbour the gap of a row that is no longer there (see Collapse).
  await expect(page.locator("[data-collapse]")).toHaveCount(0);
  expect(await settled()).toBeCloseTo(closed, 0);
});

test("decodes camera RAW and TIFF, which Chromium cannot read by itself", async ({ page }) => {
  await page.goto("/");
  // The real decode path, in the real engine: LibRaw's worker and wasm, UTIF
  // and pako, exactly as the app loads them. The colours are the test — a
  // decoder that ran but got white balance or the CFA pattern wrong would
  // still produce an image of the right size.
  const decode = (file: string) =>
    page.evaluate(async (bytes) => {
      const module = "/src/lib/pdf/images.ts";
      const { decodeToCanvas } = await import(/* @vite-ignore */ module);
      const canvas: HTMLCanvasElement = await decodeToCanvas(new Uint8Array(bytes));
      const ctx = canvas.getContext("2d")!;
      const middle = Math.floor(canvas.height / 2);
      const at = (x: number) => Array.from(ctx.getImageData(x, middle, 1, 1).data.slice(0, 3));
      return {
        width: canvas.width,
        height: canvas.height,
        left: at(4),
        right: at(canvas.width - 5),
      };
    }, [...readFileSync(file)]);

  const dng = await decode("tests/fixtures/photo.dng");
  expect([dng.width, dng.height]).toEqual([64, 48]);
  const [r1, g1, b1] = dng.left;
  expect(r1).toBeGreaterThan(200);
  expect(Math.max(g1, b1)).toBeLessThan(100);
  const [r2, g2, b2] = dng.right;
  expect(b2).toBeGreaterThan(200);
  expect(Math.max(r2, g2)).toBeLessThan(100);

  const tiff = await decode("tests/fixtures/scan.tif");
  expect([tiff.width, tiff.height]).toEqual([40, 20]);
  expect(tiff.left).toEqual([20, 160, 60]);
});

test("converts RAW and TIFF files, with previews in the tray", async ({ page }) => {
  await page.goto("/");
  await openToolWithFiles(page, /Image → Image/, [
    "tests/fixtures/photo.dng",
    "tests/fixtures/scan.tif",
  ]);
  // Neither format can go to an <img> as-is; both are decoded for the tray.
  await expect(page.locator('img[src^="data:image/jpeg"]')).toHaveCount(2, {
    timeout: 15_000,
  });
  await page.getByRole("button", { name: "Lancer" }).click();
  await expect(page.getByText("2 fichiers produits")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("photo.jpg")).toBeVisible();
  await expect(page.getByText("scan.jpg")).toBeVisible();
});

test("puts a RAW photo into a PDF", async ({ page }) => {
  await page.goto("/");
  await openToolWithFiles(page, /Images → PDF/, ["tests/fixtures/photo.dng"]);
  await page.getByRole("button", { name: "Lancer" }).click();
  await expect(page.getByText("1 fichier produit")).toBeVisible({ timeout: 30_000 });
});

test("rotates every page, the landscape ones, or the ones picked", async ({ page }) => {
  await page.goto("/");
  await openToolWithFiles(page, /Pivoter/, ["tests/fixtures/alpha.pdf"]);

  await page.getByRole("button", { name: "Lancer" }).click();
  await expect(page.getByText("1 fichier produit")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("alpha_pivote.pdf")).toBeVisible();

  // alpha.pdf is all portrait: a landscape-only pass has nothing to do, and
  // says so rather than handing back an identical copy.
  await page.getByRole("radio", { name: "Paysage" }).click();
  await page.getByRole("button", { name: "Lancer" }).click();
  await expect(page.getByText(/Aucune page ne correspond/)).toBeVisible();

  // Picking starts from every page; the selected ones are shown turned.
  await page.getByRole("radio", { name: "Choisir" }).click();
  await expect(page.getByText("3 pages sélectionnées")).toBeVisible();
  const thumbnail = (n: number) => page.getByRole("button", { name: `Page ${n}` }).locator("img");
  await expect(thumbnail(1)).toBeVisible({ timeout: 15_000 });
  // rotate(90deg) computes to matrix(0, s, -s, 0, 0, 0).
  await expect(thumbnail(1)).toHaveCSS("transform", /^matrix\(0, 0\.\d+, -0\.\d+, 0/);

  await page.getByRole("button", { name: "Page 2" }).click();
  await expect(page.getByText("2 pages sélectionnées")).toBeVisible();
  await expect(thumbnail(2)).toHaveCSS("transform", "none");
  await page.screenshot({ path: "tests/screenshots/rotate.png" });

  await page.getByRole("button", { name: "Lancer" }).click();
  await expect(page.getByText("1 fichier produit")).toBeVisible({ timeout: 15_000 });
});

test("keeps both panels still when files arrive, and eases the drop area down", async ({
  page,
}) => {
  await page.goto("/");
  const documents = page.getByRole("region", { name: "Documents" });
  const tool = page.locator("section[data-card]");
  const drop = page.locator("[data-drop-area]");
  const before = [await documents.boundingBox(), await tool.boundingBox()];
  const tall = (await drop.boundingBox())!.height;

  const chooser = page.waitForEvent("filechooser");
  await page.getByText(/Déposez/).click();
  await (await chooser).setFiles(["tests/fixtures/alpha.pdf"]);
  const samples: number[] = await page.evaluate(async () => {
    const element = document.querySelector("[data-drop-area]") as HTMLElement;
    const heights: number[] = [];
    for (let i = 0; i < 24; i++) {
      heights.push(element.getBoundingClientRect().height);
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    return heights;
  });
  await expect(documents.getByText("alpha.pdf")).toBeVisible();
  const short = (await drop.boundingBox())!.height;

  // Nothing outside the Documents card moved, and the card itself did not
  // change shape: the drop area made room for the list from the inside.
  expect([await documents.boundingBox(), await tool.boundingBox()]).toEqual(before);
  expect(short).toBeLessThan(tall / 3);
  // ...and it got there by travelling, not in one frame.
  expect(samples.some((height) => height < tall - 10 && height > short + 10)).toBe(true);
});

test("keeps the run button at the foot of the tool panel, through the whole run", async ({
  page,
}) => {
  await page.goto("/");
  await openToolWithFiles(page, /Fusionner/, [
    "tests/fixtures/alpha.pdf",
    "tests/fixtures/beta.pdf",
  ]);
  const panel = (await page.locator("section[data-card]").boundingBox())!;
  const run = (await page.getByRole("button", { name: "Lancer" }).boundingBox())!;
  // The floor of the panel, spanning it — not a button alone in a corner.
  expect(panel.y + panel.height - (run.y + run.height)).toBeLessThan(40);
  expect(run.width).toBeGreaterThan(panel.width * 0.6);

  await page.getByRole("button", { name: "Lancer" }).click();
  await expect(page.getByText("1 fichier produit")).toBeVisible({ timeout: 15_000 });
  // The result grew in above it; the action that follows the run is exactly
  // where the run was.
  const save = (await page.getByRole("button", { name: "Enregistrer" }).boundingBox())!;
  expect(save.y + save.height).toBeCloseTo(run.y + run.height, 0);
  await page.screenshot({ path: "tests/screenshots/result-panel.png" });
});

test("slides the sidebar selection from one tool to the next", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Fusionner/ }).click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /Compresser/ }).click();
  const moving = await page.evaluate(() =>
    document
      .querySelector("[data-motion]")!
      .getAnimations()
      .some((animation) => (animation as CSSTransition).transitionProperty === "transform"),
  );
  expect(moving).toBe(true);
  await expect(page.getByRole("button", { name: /Compresser/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
