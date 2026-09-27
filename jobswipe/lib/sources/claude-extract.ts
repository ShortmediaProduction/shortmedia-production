import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { claude, pruefeStopp } from "@/lib/anthropic";
import { env } from "@/lib/config";
import type { RawJob } from "@/lib/types";

const ExtraktSchema = z.object({
  stellen: z.array(
    z.object({
      titel: z.string(),
      firma: z.string().nullable(),
      ort: z.string().nullable(),
      url: z.string().nullable().describe("Link zur Einzelanzeige, exakt wie im Text"),
      pensum: z.string().nullable(),
      startdatum: z.string().nullable(),
      kurzbeschreibung: z.string().nullable(),
    }),
  ),
});

/**
 * Fallback, wenn kein Parser passt oder ein Parser nichts findet, und für Karriereseiten:
 * Claude liest die Stellen aus dem Text heraus. Es werden nur Stellen übernommen, die wirklich im Text stehen.
 */
export async function extrahiereStellen(text: string, quelle: string, firmaStandard?: string): Promise<RawJob[]> {
  const msg = await claude().messages.parse({
    model: env.scoringModel,
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    output_config: { effort: "low", format: zodOutputFormat(ExtraktSchema) },
    system:
      "Du extrahierst Stellenangebote aus einem Text (Job-Alert-Mail oder Karriereseite). Liste nur echte, konkret ausgeschriebene Stellen auf, die im Text stehen. Keine Navigation, keine Werbung, keine Kurse oder Weiterbildungen. Übernimm Links exakt. Fehlende Angaben sind null. Gibt es keine Stellen, liefere eine leere Liste.",
    messages: [{ role: "user", content: `Quelle: ${quelle}\n${firmaStandard ? `Firma der Seite: ${firmaStandard}\n` : ""}\n---\n${text.slice(0, 60_000)}` }],
  });
  pruefeStopp(msg, "Extraktion");
  const stellen = msg.parsed_output?.stellen ?? [];
  return stellen
    .map((s) => ({
      quelle,
      titel: s.titel.trim(),
      firma: (s.firma ?? firmaStandard ?? "").trim(),
      ort: s.ort,
      url: s.url && /^https?:\/\//.test(s.url) && text.includes(s.url) ? s.url : null,
      pensum: s.pensum,
      startdatum: s.startdatum,
      beschreibung: s.kurzbeschreibung,
    }))
    .filter((s) => s.titel && s.firma);
}
