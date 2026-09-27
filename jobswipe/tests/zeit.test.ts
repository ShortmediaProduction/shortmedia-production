import { describe, expect, it } from "vitest";
import { zuerichStunde } from "@/lib/zeit";
import { filtereDeck } from "@/lib/deck";
import { demoJobs } from "@/lib/db/demo-data";

describe("Cron-Zeit", () => {
  it("rechnet Sommer- und Winterzeit richtig", () => {
    expect(zuerichStunde(new Date("2026-07-01T04:00:00Z"))).toBe(6); // Sommer: 04 UTC = 06 Zürich
    expect(zuerichStunde(new Date("2026-12-01T05:00:00Z"))).toBe(6); // Winter: 05 UTC = 06 Zürich
    expect(zuerichStunde(new Date("2026-07-01T05:00:00Z"))).toBe(7);
  });
});

describe("Deck-Filter", () => {
  it("filtert nach Mindest-Score und Kategorie und sortiert nach Score", () => {
    const jobs = demoJobs();
    const deck = filtereDeck(jobs, { regionen: [], mindest_score: 60, kategorien: ["Kamera-Department", "Rental/Technik", "Post/Color"], web_quellen: [], letzter_lauf: null, lauf_log: null });
    expect(deck.map((j) => j.score)).toEqual([91, 74, 63]);
  });
});
