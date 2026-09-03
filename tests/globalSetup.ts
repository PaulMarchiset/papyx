import { mkdir, writeFile } from "node:fs/promises";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/** Writes the sample documents the specs upload. */
export default async function globalSetup() {
  await mkdir("tests/fixtures", { recursive: true });

  for (const [name, pages] of [
    ["alpha.pdf", 3],
    ["beta.pdf", 2],
  ] as const) {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    for (let i = 1; i <= pages; i++) {
      const page = doc.addPage([420, 595]);
      page.drawText(`${name} — page ${i}`, {
        x: 48,
        y: 500,
        size: 22,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
    }
    await writeFile(`tests/fixtures/${name}`, await doc.save());
  }
}
