import { describe, expect, it } from "vitest";
import { PDFDocument, degrees } from "pdf-lib";
import { makePdf, makePng } from "@/test/fixtures";
import { mergePdfs } from "@/lib/pdf/merge";
import { splitPdf } from "@/lib/pdf/split";
import { organizePdf } from "@/lib/pdf/organize";
import { imagesToPdf } from "@/lib/pdf/imagesToPdf";
import { addPageNumbers, toWinAnsi, watermarkPdf } from "@/lib/pdf/stamp";
import { readMetadata, writeMetadata } from "@/lib/pdf/metadata";
import { readPageCount } from "@/lib/pdf/document";

describe("mergePdfs", () => {
  it("concatenates every page in order", async () => {
    const merged = await mergePdfs([
      { bytes: await makePdf(2) },
      { bytes: await makePdf(3) },
    ]);
    expect(await readPageCount(merged)).toBe(5);
  });
});

describe("splitPdf", () => {
  it("makes one file per range, named after the pages it holds", async () => {
    const outputs = await splitPdf(
      { name: "rapport.pdf", bytes: await makePdf(6) },
      { kind: "ranges", groups: [[1, 2, 3], [5]] },
    );
    expect(outputs.map((o) => o.name)).toEqual(["rapport_1-3.pdf", "rapport_5.pdf"]);
    expect(await readPageCount(outputs[0].bytes)).toBe(3);
    expect(await readPageCount(outputs[1].bytes)).toBe(1);
  });

  it("splits every N pages with a short final chunk", async () => {
    const outputs = await splitPdf(
      { name: "doc.pdf", bytes: await makePdf(5) },
      { kind: "every", size: 2 },
    );
    expect(outputs).toHaveLength(3);
    expect(await readPageCount(outputs[2].bytes)).toBe(1);
  });

  it("folds a selection into a single document in extract mode", async () => {
    const outputs = await splitPdf(
      { name: "doc.pdf", bytes: await makePdf(9) },
      { kind: "extract", pages: [9, 1] },
    );
    expect(outputs).toHaveLength(1);
    expect(await readPageCount(outputs[0].bytes)).toBe(2);
  });
});

describe("organizePdf", () => {
  it("keeps only the planned pages, in the planned order, with rotation", async () => {
    const bytes = await organizePdf({ bytes: await makePdf(4) }, [
      { page: 3, rotation: 90 },
      { page: 1, rotation: 0 },
    ]);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(2);
    expect(doc.getPage(0).getRotation().angle).toBe(90);
    expect(doc.getPage(1).getRotation().angle).toBe(0);
  });
});

describe("imagesToPdf", () => {
  it("gives the page the image proportions in auto mode", async () => {
    const bytes = await imagesToPdf([{ bytes: makePng(40, 20) }], {
      pageSize: "auto",
      orientation: "auto",
      marginMm: 0,
    });
    const doc = await PDFDocument.load(bytes);
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBe(40);
    expect(height).toBe(20);
  });

  it("fits the image inside a fixed page size", async () => {
    const bytes = await imagesToPdf([{ bytes: makePng(400, 200) }], {
      pageSize: "a4",
      orientation: "portrait",
      marginMm: 10,
    });
    const doc = await PDFDocument.load(bytes);
    expect(Math.round(doc.getPage(0).getSize().width)).toBe(595);
  });
});

describe("stamping", () => {
  it("adds a watermark without touching the page count", async () => {
    const bytes = await watermarkPdf(
      { bytes: await makePdf(3) },
      {
        text: "CONFIDENTIEL",
        fontSize: 40,
        opacity: 0.3,
        angle: 45,
        color: "#c4502e",
        layout: "center",
        marginMm: 10,
        pages: [],
      },
    );
    expect(await readPageCount(bytes)).toBe(3);
  });

  it("numbers only the selected pages", async () => {
    const bytes = await addPageNumbers({ bytes: await makePdf(4) }, {
      format: "{n} / {total}",
      position: "bottom-center",
      fontSize: 10,
      color: "#000000",
      marginMm: 12,
      startAt: 1,
      pages: [2, 3],
    });
    expect(await readPageCount(bytes)).toBe(4);
  });

  it("stamps a rotated page without disturbing its rotation", async () => {
    const source = await PDFDocument.load(await makePdf(2));
    source.getPage(0).setRotation(degrees(90));
    const bytes = await addPageNumbers({ bytes: await source.save() }, {
      format: "{n}",
      position: "bottom-center",
      fontSize: 10,
      color: "#000000",
      marginMm: 12,
      startAt: 1,
      pages: [],
    });
    const stamped = await PDFDocument.load(bytes);
    expect(stamped.getPage(0).getRotation().angle).toBe(90);
    expect(stamped.getPage(1).getRotation().angle).toBe(0);
  });

  it("folds typographic characters Helvetica cannot encode", () => {
    expect(toWinAnsi("l\u2019été \u2014 « ok »")).toBe("l'été - « ok »");
    expect(toWinAnsi("日本")).toBe("??");
  });
});

describe("metadata", () => {
  it("round-trips the fields it writes", async () => {
    const bytes = await writeMetadata({ bytes: await makePdf(1) }, {
      title: "Rapport",
      author: "Paul",
      subject: "Essai",
      keywords: "pdf, local",
      creator: "Papyx",
      producer: "Papyx",
      creationDate: null,
      modificationDate: null,
    });
    const metadata = await readMetadata({ bytes });
    expect(metadata.title).toBe("Rapport");
    expect(metadata.author).toBe("Paul");
    expect(metadata.keywords).toContain("local");
  });
});
