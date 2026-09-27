import { describe, expect, it } from "vitest";
import { baueMime, kodiereHeader } from "@/lib/gmail/mime";

describe("MIME", () => {
  it("kodiert Umlaute im Betreff", () => {
    expect(kodiereHeader("Bewerbung")).toBe("Bewerbung");
    expect(kodiereHeader("Bewerbung Kamera-Trainee – Zürich")).toMatch(/^=\?UTF-8\?B\?/);
  });

  it("baut Entwurf ohne Empfänger mit Anhängen", () => {
    const mime = baueMime(
      { betreff: "Test", text: "Guten Tag zusammen,\nZeile 2", anhaenge: [{ dateiname: "cv.pdf", contentType: "application/pdf", daten: Buffer.from("%PDF-1.4") }] },
      "GRENZE",
    );
    expect(mime).not.toMatch(/^To:/m);
    expect(mime).toContain('boundary="GRENZE"');
    expect(mime).toContain('filename="cv.pdf"');
    expect(mime.trim().endsWith("--GRENZE--")).toBe(true);
    const body = mime.split("\r\n\r\n")[2].split("\r\n--GRENZE")[0].replace(/\r\n/g, "");
    expect(Buffer.from(body, "base64").toString("utf8")).toBe("Guten Tag zusammen,\r\nZeile 2");
  });

  it("setzt Empfänger, wenn vorhanden", () => {
    expect(baueMime({ an: "jobs@example.com", betreff: "x", text: "y", anhaenge: [] })).toMatch(/^To: jobs@example.com/);
  });
});
