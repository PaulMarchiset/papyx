import { expect, test, type Page } from "@playwright/test";

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

  const rows = page.getByRole("listitem");
  await expect(rows.first()).toContainText("alpha.pdf");
  await rows.nth(1).dragTo(rows.first());

  await expect(rows.first()).toContainText("beta.pdf");
  // The derived name follows the new first document, which is the tell that
  // the merge order really changed and not just the display.
  await expect(page.getByRole("textbox")).toHaveValue("beta_fusion.pdf");
});

test("reorders pages by dragging a thumbnail", async ({ page }) => {
  await page.goto("/");
  await openToolWithFiles(page, /Organiser/, ["tests/fixtures/alpha.pdf"]);
  await expect(page.locator(".grid > div img[alt='']")).toHaveCount(3, { timeout: 20_000 });

  const cards = page.locator(".grid > div");
  await expect(cards.first()).toContainText("1");
  // Dropping on the left half of a card inserts before it, so aim at the edge.
  await cards.nth(2).dragTo(cards.first(), { targetPosition: { x: 3, y: 40 } });

  // A card keeps its source page number, so page 3 now leads the document.
  await expect(cards.first()).toContainText("3");
});

test("renders page thumbnails in the organize tool", async ({ page }) => {
  await page.goto("/");
  await openToolWithFiles(page, /Organiser/, ["tests/fixtures/alpha.pdf"]);

  // Three thumbnails means the pdf.js worker booted and rendered to canvas.
  // Scoped to the page cards: the file tray carries a preview of its own.
  const thumbnails = page.locator(".grid > div img[alt='']");
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
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
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

  // Switching tool is one click on another card, with no screen change.
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
  await expect(page.getByText("alpha_fusion.pdf")).toBeVisible();
  await expect(page.getByText("beta.pdf")).toHaveCount(0);
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
  await expect(page.locator(".grid > div")).toHaveCount(3, { timeout: 20_000 });

  await page.getByRole("listitem").filter({ hasText: "beta.pdf" }).click();
  await expect(page.locator(".grid > div")).toHaveCount(2, { timeout: 20_000 });
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

test("sits the wordmark on the same baseline as the badge beside it", async ({ page }) => {
  await page.goto("/");
  const delta = await page.evaluate(() => {
    const svg = document.querySelector("header svg") as SVGSVGElement;
    const box = svg.getBoundingClientRect();
    const viewBox = svg.viewBox.baseVal;
    // Flat bottom of the P/a/x glyphs in the artwork's own units.
    const baseline =
      box.top + (332.934 - viewBox.y) * (box.height / viewBox.height);

    const pill = document.querySelector("header span.bg-badge-bg") as HTMLElement;
    const text = [...pill.childNodes].find((node) => node.nodeType === 3) as Text;
    const range = document.createRange();
    range.selectNode(text);
    const style = getComputedStyle(pill);
    const context = document.createElement("canvas").getContext("2d")!;
    context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const pillBaseline =
      range.getBoundingClientRect().top +
      context.measureText(text.data).fontBoundingBoxAscent;

    return Math.abs(baseline - pillBaseline);
  });
  expect(delta).toBeLessThanOrEqual(0.5);
});

test("opens a tool without animating anything into place", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Fusionner/ }).click();
  await expect(page.getByRole("heading", { name: "Fusionner" })).toBeVisible();

  // Panels, cards and menus are simply there when they open: nothing is
  // mid-entrance a frame after the click that produced it.
  expect(
    await page.evaluate(() =>
      document.getAnimations().filter((animation) => animation.playState === "running").length,
    ),
  ).toBe(0);

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

test("swaps home and settings without remounting the open tool", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Fusionner/ }).click();

  await page.getByRole("button", { name: "Réglages" }).click();
  await expect(page.getByRole("heading", { name: "Réglages" })).toBeVisible();
  // Settings has no back button of its own: the header toggle both opens and
  // closes it.
  await expect(page.getByRole("button", { name: "Retour" })).toHaveCount(0);

  await page.getByRole("button", { name: "Réglages" }).click();
  // Coming back must not have remounted Home — the tool is still the one that
  // was open, which a `key` on the shared container would have lost.
  await expect(page.getByRole("button", { name: /Fusionner/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("grows a conditional option into place instead of inserting it", async ({ page }) => {
  await page.goto("/");
  await openToolWithFiles(page, /PDF → Images/, ["tests/fixtures/alpha.pdf"]);
  const card = page.locator(".scroll-mt-4 .rounded-2xl").first();
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
    const element = document.querySelector(".scroll-mt-4 .rounded-2xl") as HTMLElement;
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
  // The card was caught between its two heights: the row grew rather than
  // being inserted at full size, which is what carries the run bar under it.
  expect(samples.some((height) => height > closed && height < open)).toBe(true);

  await page.getByRole("button", { name: "Standard" }).click();
  await expect(page.getByText("Qualité")).toHaveCount(0);
  // Closed, the row leaves nothing behind — a zero-height box would still hand
  // its neighbour the gap of a row that is no longer there (see Collapse).
  await expect(page.locator("[data-collapse]")).toHaveCount(0);
  expect(await settled()).toBeCloseTo(closed, 0);
});
