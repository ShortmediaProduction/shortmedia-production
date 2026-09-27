import { describe, expect, it } from "vitest";
import { dedupeKey, istDuplikat, normalisiereFirma, titelAehnlichkeit } from "@/lib/dedupe";

describe("Duplikaterkennung", () => {
  it("normalisiert Rechtsformen und Umlaute", () => {
    expect(normalisiereFirma("Grade Lab AG")).toBe(normalisiereFirma("grade lab"));
    expect(normalisiereFirma("Zürcher Film GmbH")).toBe("zurcher-film");
  });

  it("ignoriert Genderzusätze und Pensum im Titel", () => {
    expect(dedupeKey("Beispiel Film AG", "Kamera-Assistent (m/w/d) 80-100%")).toBe(dedupeKey("Beispiel Film", "Kamera-Assistent"));
    expect(dedupeKey("X", "Videograf:in 100%")).toBe(dedupeKey("X", "Videograf"));
  });

  it("erkennt ähnliche Titel bei gleicher Firma", () => {
    expect(istDuplikat({ firma: "Nordlicht Studios", titel: "Junior Videograf Social Media" }, { firma: "Nordlicht Studios AG", titel: "Junior Videograf (Social Media) 80%" })).toBe(true);
    expect(istDuplikat({ firma: "Nordlicht Studios", titel: "Junior Videograf" }, { firma: "Nordlicht Studios", titel: "Head of Finance" })).toBe(false);
    expect(istDuplikat({ firma: "A AG", titel: "Videograf" }, { firma: "B AG", titel: "Videograf" })).toBe(false);
  });

  it("berechnet Ähnlichkeit", () => {
    expect(titelAehnlichkeit("Kamera Trainee", "Kamera Trainee")).toBe(1);
    expect(titelAehnlichkeit("", "x")).toBe(0);
  });
});
