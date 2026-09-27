import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { claude, kontextBloecke, pruefeStopp } from "@/lib/anthropic";
import { env } from "@/lib/config";
import { db } from "@/lib/db";
import type { SwipeMitJob } from "@/lib/db/repo";
import { KATEGORIEN, type Job, type Settings } from "@/lib/types";

export const ScoringSchema = z.object({
  score: z.number().describe("0 bis 100"),
  kategorie: z.enum(KATEGORIEN),
  gruende_dafuer: z.array(z.string()).describe("höchstens 3 kurze Punkte"),
  red_flags: z.array(z.string()),
  bewerbungsweg: z.enum(["email", "portal", "unklar"]),
  bewerbungs_email: z.string().nullable(),
  portal_url: z.string().nullable(),
  kontaktperson: z.string().nullable().describe("nur wenn in der Anzeige namentlich genannt"),
  ort: z.string().nullable(),
  pensum: z.string().nullable(),
  startdatum: z.string().nullable(),
  firma_website: z.string().nullable().describe("nur wenn in der Anzeige genannt"),
});
export type ScoringErgebnis = z.infer<typeof ScoringSchema>;

const SYSTEM = `Du bewertest Stellenangebote für Julian Lang. Die Faktenbasis ist das beigelegte Dokument «Karriereprofil». Du bist ehrlich und streng: ein hoher Score bedeutet, dass sich eine Bewerbung für Julian wirklich lohnt.

Bewertungslogik:
- Am wertvollsten sind Rollen nah an professioneller Filmproduktion mit Lernkurve, besonders im Kamera-Department (2nd AC, Kamera-Trainee, DIT). Auch Praktika, Produktionsassistenz, Videograf/Junior Filmmaker mit filmischem Anspruch, Rental/Technik sowie Post/Color sind interessant.
- Reiner Social-Media-Content ohne filmischen Anspruch, Vertrieb oder fachfremde Rollen: niedriger Score.
- Verfügbarkeit: Rekrutenschule bis Ende Oktober 2026. Gespräche ab November 2026, fester Einstieg ab Januar 2027. Ein Start vor Januar 2027 ist ein Red Flag (aber kein Ausschluss, wenn die Rolle sehr gut passt).
- Weitere typische Red Flags: Drohnenlizenz/BAZL nötig, Umzug nötig (Wohnort Sissach BL), Pensum unter 80 %, Sprache (Julian spricht Deutsch, Französisch, Englisch), fehlende Qualifikation, Führerausweis-Kategorien, die nicht belegt sind.
- Erfinde nichts. Wenn eine Angabe nicht in der Anzeige steht, setze null.

Felder:
- score: ganze Zahl 0 bis 100
- gruende_dafuer: höchstens 3 sehr kurze Punkte (je max. 8 Wörter)
- red_flags: kurze Punkte, leer wenn keine
- bewerbungsweg: "email" wenn eine Bewerbungsadresse in der Anzeige steht, "portal" wenn über ein Online-Formular/Portal beworben wird, sonst "unklar"
- kategorie: genau eine der vorgegebenen Kategorien`;

function beispielText(rechts: SwipeMitJob[], links: SwipeMitJob[]): string {
  const zeile = (s: SwipeMitJob) =>
    `- ${s.job.titel} bei ${s.job.firma}${s.job.ort ? ` (${s.job.ort})` : ""}, Kategorie ${s.job.kategorie ?? "?"}${s.grund ? `, Grund: ${s.grund}` : ""}`;
  if (!rechts.length && !links.length) return "";
  return [
    "Julians bisherige Entscheidungen. Nutze sie, um seine Vorlieben besser zu treffen:",
    rechts.length ? `Beworben (nach rechts geswipt):\n${rechts.map(zeile).join("\n")}` : "",
    links.length ? `Abgelehnt (nach links geswipt):\n${links.map(zeile).join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function stellenText(job: Pick<Job, "titel" | "firma" | "ort" | "pensum" | "startdatum" | "quelle" | "url" | "beschreibung" | "kontakt" | "email">): string {
  return [
    `Titel: ${job.titel}`,
    `Firma: ${job.firma}`,
    job.ort && `Ort: ${job.ort}`,
    job.pensum && `Pensum: ${job.pensum}`,
    job.startdatum && `Start: ${job.startdatum}`,
    job.kontakt && `Kontakt: ${job.kontakt}`,
    job.email && `E-Mail: ${job.email}`,
    `Quelle: ${job.quelle}`,
    job.url && `Link: ${job.url}`,
    "",
    job.beschreibung ? `Anzeigentext:\n${job.beschreibung}` : "(Kein Anzeigentext verfügbar, nur Titel, Firma und Ort.)",
  ]
    .filter((z): z is string => typeof z === "string")
    .join("\n");
}

export async function bewerteJob(job: Job, settings: Settings): Promise<ScoringErgebnis> {
  const repo = db();
  const [rechts, links, profil] = await Promise.all([
    repo.letzteSwipes("rechts", 10),
    repo.letzteSwipes("links", 10),
    kontextBloecke(["karriereprofil"]),
  ]);
  if (!profil.length) throw new Error("Karriereprofil fehlt im Kontext-Speicher.");

  const msg = await claude().messages.parse({
    model: env.scoringModel,
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    output_config: { effort: "low", format: zodOutputFormat(ScoringSchema) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          ...profil,
          {
            type: "text",
            text: [
              `Bevorzugte Regionen: ${settings.regionen.join(", ") || "ganze Schweiz"}.`,
              beispielText(rechts, links),
              "Bewerte diese Stelle:",
              stellenText(job),
            ]
              .filter(Boolean)
              .join("\n\n"),
          },
        ],
      },
    ],
  });
  pruefeStopp(msg, "Scoring");
  if (!msg.parsed_output) throw new Error("Scoring: keine gültige JSON-Antwort.");
  const r = msg.parsed_output;
  return {
    ...r,
    score: Math.max(0, Math.min(100, Math.round(r.score))),
    gruende_dafuer: r.gruende_dafuer.slice(0, 3),
  };
}

/** Bewertet alle offenen Stellen (begrenzt pro Lauf). */
export async function bewerteOffene(limit: number, settings: Settings): Promise<{ bewertet: number; fehler: string[] }> {
  const repo = db();
  const jobs = await repo.jobsZumBewerten(limit);
  let bewertet = 0;
  const fehler: string[] = [];
  for (const job of jobs) {
    try {
      const r = await bewerteJob(job, settings);
      await repo.updateJob(job.id, {
        score: r.score,
        kategorie: r.kategorie,
        gruende: r.gruende_dafuer,
        red_flags: r.red_flags,
        bewerbungsweg: r.bewerbungsweg,
        email: job.email ?? r.bewerbungs_email,
        portal_url: r.portal_url,
        kontakt: job.kontakt ?? r.kontaktperson,
        ort: job.ort ?? r.ort,
        pensum: job.pensum ?? r.pensum,
        startdatum: job.startdatum ?? r.startdatum,
        firma_website: r.firma_website,
        scoring_status: "fertig",
        scoring_fehler: null,
      });
      bewertet++;
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      fehler.push(`${job.firma} / ${job.titel}: ${m}`);
      await repo.updateJob(job.id, { scoring_status: "fehler", scoring_fehler: m });
    }
  }
  return { bewertet, fehler };
}
