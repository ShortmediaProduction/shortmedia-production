import type Anthropic from "@anthropic-ai/sdk";
import { claude, pruefeStopp, textAus } from "@/lib/anthropic";
import { env } from "@/lib/config";
import { stellenText } from "@/lib/scoring";
import type { Job, Recherche } from "@/lib/types";

const SYSTEM = `Du recherchierst eine Firma für eine Bewerbung von Julian Lang (junger Filmemacher, Richtung Kamera/Cinematography).
Ziel: belegbare Fakten, warum genau diese Firma zu ihm passt. Finde die offizielle Website der Firma und lies die relevanten Seiten (Über uns, Arbeiten/Referenzen/Projekte, Team). Nutze die Stellenanzeige als zweite Quelle.

Strenge Regeln:
- Nur Fakten aufnehmen, die wörtlich oder eindeutig auf der Website der Firma oder in der Anzeige stehen. Jede Aussage mit der URL der Seite belegen, auf der sie steht.
- Nichts vermuten, nichts ergänzen, keine Presseartikel über Dritte als Firmenfakten ausgeben.
- Keine LinkedIn-, Indeed- oder Glassdoor-Seiten abrufen.
- Wenn du die Website nicht findest, sag das und liefere nur Fakten aus der Anzeige.

Antworte am Ende ausschliesslich mit einem JSON-Objekt in <json>…</json>:
{"website": "https://… oder null", "fakten": [{"fakt": "…", "quelle": "https://…"}], "aufhaenger": "ein konkreter, belegter Grund, warum diese Firma für Julian besonders interessant ist, oder null"}
Höchstens 8 Fakten, die für eine Bewerbung im Film-/Kamerabereich relevant sind (Arbeiten, Kunden, Formate, Arbeitsweise, Equipment, Ausbildung von Nachwuchs).`;

export function parseRecherche(text: string): Recherche {
  const roh = text.match(/<json>([\s\S]*?)<\/json>/)?.[1] ?? text.match(/\{[\s\S]*\}/)?.[0];
  if (!roh) return { website: null, fakten: [], aufhaenger: null };
  try {
    const j = JSON.parse(roh) as Partial<Recherche>;
    return {
      website: typeof j.website === "string" ? j.website : null,
      fakten: Array.isArray(j.fakten)
        ? j.fakten.filter((f) => f && typeof f.fakt === "string" && typeof f.quelle === "string").slice(0, 8)
        : [],
      aufhaenger: typeof j.aufhaenger === "string" ? j.aufhaenger : null,
    };
  } catch {
    return { website: null, fakten: [], aufhaenger: null };
  }
}

export async function recherchiereFirma(job: Job): Promise<Recherche> {
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Firma: ${job.firma}\n${job.firma_website ? `Bekannte Website: ${job.firma_website}\n` : ""}\nStellenanzeige:\n${stellenText(job)}`,
    },
  ];
  const tools: Anthropic.Messages.ToolUnion[] = [
    { type: "web_search_20260209", name: "web_search", max_uses: 5, user_location: { type: "approximate", country: "CH" } },
    {
      type: "web_fetch_20260209",
      name: "web_fetch",
      max_uses: 8,
      blocked_domains: ["linkedin.com", "indeed.com", "indeed.ch", "glassdoor.com", "glassdoor.ch", "xing.com"],
    },
  ];

  let msg: Anthropic.Message | null = null;
  // Server-Tools können mit pause_turn unterbrechen; dann einfach weiterlaufen lassen.
  for (let i = 0; i < 4; i++) {
    msg = await claude()
      .messages.stream({
        model: env.scoringModel,
        max_tokens: 16000,
        thinking: { type: "adaptive" },
        output_config: { effort: "medium" },
        system: SYSTEM,
        tools,
        messages,
      })
      .finalMessage();
    if (msg.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: msg.content });
  }
  if (!msg) throw new Error("Recherche: keine Antwort.");
  pruefeStopp(msg, "Recherche");
  return parseRecherche(textAus(msg));
}
