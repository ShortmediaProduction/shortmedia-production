import { describe, expect, it } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { renderBrief, formatiereDatum } from "@/lib/pdf/brief";

describe("PDF", () => {
  it("formatiert Datum auf Deutsch", () => {
    expect(formatiereDatum(new Date("2026-09-27T10:00:00Z"))).toBe("27. September 2026");
  });

  it("rendert ein Motivationsschreiben", async () => {
    const pdf = await renderBrief({
      firma: "Beispiel Filmproduktion AG",
      kontakt: "Frau Anna Muster",
      ort: "Basel",
      untertitel: "Einstieg im Kameradepartement",
      anrede: "Guten Tag Frau Muster,",
      text: "Erster Absatz mit Umlauten: äöü ÄÖÜ und «Guillemets».\n\nZweiter Absatz. fest einsteigen könnte ich ab Januar 2027.",
      datum: new Date("2026-09-27T10:00:00Z"),
    });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(5000);
    if (process.env.PDF_OUT) {
      mkdirSync(process.env.PDF_OUT, { recursive: true });
      writeFileSync(`${process.env.PDF_OUT}/brief-test.pdf`, pdf);
    }
  });
});
