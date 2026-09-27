import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { claude, kontextBloecke, pruefeStopp } from "@/lib/anthropic";
import { env } from "@/lib/config";
import { stellenText } from "@/lib/scoring";
import type { Job, Recherche } from "@/lib/types";
import { HARTE_REGELN } from "./regeln";

export const BewerbungSchema = z.object({
  anrede: z.string().describe("«Guten Tag Herr/Frau Nachname,» oder «Guten Tag zusammen,»"),
  betreff: z.string().describe("kurzer Betreff für die E-Mail, ohne Gedankenstrich"),
  anschreiben: z.string().describe("Motivationsschreiben ohne Anrede und ohne Grussformel, Absätze durch Leerzeilen getrennt"),
  mail_text: z.string().describe("E-Mail-Text ohne Anrede und ohne Grussformel/Signatur, Absätze durch Leerzeilen getrennt"),
  untertitel: z.string().describe("kurze Zeile unter «Motivationsschreiben» im PDF, z. B. «Einstieg im Kameradepartement»"),
});
export type Bewerbung = z.infer<typeof BewerbungSchema>;

const SYSTEM = `Du schreibst Bewerbungen für Julian Lang. Die beigelegten Dokumente sind verbindlich:
- «Karriereprofil»: die einzige Faktenbasis über Julian. Befolge besonders die Entscheidungslogik und das Master-Briefing darin.
- «Sprach-CI»: Ton, Vokabular, Satzbau und Negativliste. Schreibe so, wie Julian schreibt.
- «Lebenslauf»: Daten und Projekte.
- Falls vorhanden «Beispiel-Motivationsschreiben»: nur als Referenz für Ton und Länge. Wo das Beispiel von den harten Regeln abweicht, gelten die harten Regeln.

Vorgehen: zuerst Stelle und Firma verstehen, dann die 3 bis 5 relevantesten Fakten aus Julians Profil wählen, dann einen glaubwürdigen Zusammenhang zu genau dieser Firma herstellen. Firmenfakten ausschliesslich aus den belegten Recherche-Fakten oder der Anzeige nehmen. Gibt es keine belegten Firmenfakten, einen Bezug zur ausgeschriebenen Rolle herstellen statt etwas zu erfinden.

Motivationsschreiben: etwa 300 bis 420 Wörter, 5 bis 7 Absätze, persönlich und konkret. Letzter Absatz mit Verfügbarkeit und Hinweis auf Lebenslauf und Website.

E-Mail-Text: kürzer (etwa 120 bis 200 Wörter), Aufbau in dieser Reihenfolge:
1. Vorstellung mit Motivation und firmenspezifischem Aufhänger
2. ein Projekt-Detail
3. persönliche Erfahrung
4. die Bitte (Gespräch, Mitarbeit, Einstieg)
5. zuletzt die Verfügbarkeit
Lebenslauf, Motivationsschreiben und EFZ-Zeugnis sind angehängt, darauf kurz hinweisen.

${HARTE_REGELN}`;

export async function generiereBewerbung(job: Job, recherche: Recherche, feedback: string[] = []): Promise<Bewerbung> {
  const docs = await kontextBloecke(["karriereprofil", "sprachCi", "lebenslauf", "beispiel"]);
  if (!docs.length) throw new Error("Kontextdateien fehlen (Karriereprofil, Sprach-CI, Lebenslauf).");

  const fakten = recherche.fakten.length
    ? recherche.fakten.map((f) => `- ${f.fakt} (Quelle: ${f.quelle})`).join("\n")
    : "(keine belegten Fakten von der Firmen-Website gefunden)";

  const auftrag = [
    "Schreibe Motivationsschreiben und E-Mail für diese Stelle.",
    `Kontaktperson laut Anzeige: ${job.kontakt ?? "keine genannt"}`,
    `Stellenanzeige:\n${stellenText(job)}`,
    `Belegte Recherche-Fakten zur Firma${recherche.website ? ` (${recherche.website})` : ""}:\n${fakten}`,
    recherche.aufhaenger ? `Möglicher Aufhänger: ${recherche.aufhaenger}` : "",
    feedback.length
      ? `Die letzte Fassung hat diese Regeln verletzt. Schreibe neu und behebe alle Punkte:\n${feedback.map((f) => `- ${f}`).join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const msg = await claude().messages.parse({
    model: env.writingModel,
    max_tokens: 32000,
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: zodOutputFormat(BewerbungSchema) },
    system: SYSTEM,
    messages: [{ role: "user", content: [...docs, { type: "text", text: auftrag }] }],
  });
  pruefeStopp(msg, "Motivationsschreiben");
  if (!msg.parsed_output) throw new Error("Motivationsschreiben: keine gültige Antwort.");
  const b = msg.parsed_output;
  return { ...b, anrede: b.anrede.trim(), anschreiben: b.anschreiben.trim(), mail_text: b.mail_text.trim() };
}

const PruefSchema = z.object({
  ok: z.boolean(),
  verstoesse: z.array(z.string()).describe("konkrete Verstösse mit Zitat der Stelle, leer wenn ok"),
});

/** Zweiter Prüfschritt: Claude prüft den Text gegen die Red Flags im Sprach-CI und die harten Regeln. */
export async function claudePruefung(b: Bewerbung, job: Job, recherche: Recherche): Promise<string[]> {
  const docs = await kontextBloecke(["sprachCi", "karriereprofil"]);
  const msg = await claude().messages.parse({
    model: env.scoringModel,
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium", format: zodOutputFormat(PruefSchema) },
    system: `Du bist ein strenges Lektorat für Julian Langs Bewerbungen. Prüfe den Text gegen die Red Flags und die Negativliste im Sprach-CI sowie gegen diese Regeln:\n\n${HARTE_REGELN}\n\nPrüfe ausserdem:\n- Stehen Fakten über Julian drin, die nicht im Karriereprofil stehen?\n- Stehen Fakten über die Firma drin, die nicht in den belegten Recherche-Fakten oder der Anzeige stehen?\n- Ist der Text austauschbar (würde er mit einem anderen Firmennamen genauso funktionieren)?\n- Folgt die E-Mail dem Aufbau: Vorstellung mit Aufhänger, Projekt-Detail, persönliche Erfahrung, Bitte, Verfügbarkeit?\nMelde nur echte Verstösse, keine Stilvorlieben. ok = true, wenn es keine gibt.`,
    messages: [
      {
        role: "user",
        content: [
          ...docs,
          {
            type: "text",
            text: `Stellenanzeige:\n${stellenText(job)}\n\nBelegte Recherche-Fakten:\n${recherche.fakten.map((f) => `- ${f.fakt}`).join("\n") || "(keine)"}\n\n--- Anrede ---\n${b.anrede}\n\n--- Betreff ---\n${b.betreff}\n\n--- Motivationsschreiben ---\n${b.anschreiben}\n\n--- E-Mail ---\n${b.mail_text}`,
          },
        ],
      },
    ],
  });
  pruefeStopp(msg, "Prüfung");
  const r = msg.parsed_output;
  if (!r) return [];
  return r.ok ? [] : r.verstoesse.map((v) => `Lektorat: ${v}`);
}
