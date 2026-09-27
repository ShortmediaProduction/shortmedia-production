import { describe, expect, it } from "vitest";
import { pruefeAnrede, pruefeBewerbung, pruefeText, VERFUEGBARKEITS_SATZ } from "@/lib/writing/regeln";

const gut = `Guten Tag zusammen,\n\nIch drehe mit der RED Komodo-X in R3D RAW. Zuletzt entstand ein Spec Ad für Longines. Momentan bin ich in der Rekrutenschule, ${VERFUEGBARKEITS_SATZ}`;

describe("Regel-Check", () => {
  it("lässt einen sauberen Text durch", () => {
    expect(pruefeText(gut, "Mail")).toEqual([]);
  });

  it.each([
    ["Das ist groß.", "«ß»"],
    ["Kamera – Licht", "Gedankenstrich"],
    ["Kamera — Licht", "Gedankenstrich"],
    ["Kamera - Licht", "Gedankenstrich"],
    ["Meine Kündigungsfrist", "Kündigungsfrist"],
    ["Ich drehe in RAW und LOG", "RAW und LOG"],
    ["ein Spec Ad für Longine ", "Longine"],
    ["Mir wurde gekündigt", "IWF"],
    ["Hiermit bewerbe ich mich", "Floskel"],
  ])("findet Verstoss in «%s»", (satz, erwartet) => {
    const v = pruefeText(`${satz} ${VERFUEGBARKEITS_SATZ}`, "Mail");
    expect(v.join(" ")).toContain(erwartet);
  });

  it("verlangt den Verfügbarkeitssatz", () => {
    expect(pruefeText("Ab Januar 2027 bin ich verfügbar.", "Mail")[0]).toContain("Verfügbarkeitssatz");
  });

  it("erlaubt Bindestriche in Wörtern", () => {
    expect(pruefeText(`Kamera-Trainee und Video-/ Filmproduktion. ${VERFUEGBARKEITS_SATZ}`, "Mail")).toEqual([]);
  });

  it("prüft die Anrede", () => {
    expect(pruefeAnrede("Guten Tag Frau Muster,")).toBeNull();
    expect(pruefeAnrede("Guten Tag Herr von Arx,")).toBeNull();
    expect(pruefeAnrede("Guten Tag zusammen,")).toBeNull();
    expect(pruefeAnrede("Sehr geehrte Damen und Herren")).not.toBeNull();
  });

  it("prüft alle Teile einer Bewerbung", () => {
    const v = pruefeBewerbung({ anrede: "Hallo,", betreff: "Bewerbung – Kamera", anschreiben: gut, mail_text: "ohne Satz" });
    expect(v.some((x) => x.startsWith("Anrede"))).toBe(true);
    expect(v.some((x) => x.startsWith("Betreff: Gedankenstrich"))).toBe(true);
    expect(v.some((x) => x.startsWith("E-Mail: Verfügbarkeitssatz"))).toBe(true);
  });
});
