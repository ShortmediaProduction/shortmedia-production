import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/config";
import { KONTEXT, ladeKontext, type KontextName } from "@/lib/context";

let client: Anthropic | null = null;

export function claude(): Anthropic {
  if (!env.anthropicKey) throw new Error("ANTHROPIC_API_KEY fehlt.");
  client ??= new Anthropic({ apiKey: env.anthropicKey });
  return client;
}

/**
 * Baut Dokument-Blöcke aus den Kontext-PDFs. Der letzte Block bekommt einen Cache-Breakpoint,
 * damit Profil und CI bei vielen Aufrufen hintereinander nur einmal voll bezahlt werden.
 */
export async function kontextBloecke(namen: KontextName[]): Promise<Anthropic.ContentBlockParam[]> {
  const bloecke: Anthropic.DocumentBlockParam[] = [];
  for (const n of namen) {
    const data = await ladeKontext(n);
    if (!data) continue;
    bloecke.push({
      type: "document",
      title: KONTEXT[n],
      source: { type: "base64", media_type: "application/pdf", data: data.toString("base64") },
    });
  }
  if (bloecke.length) bloecke[bloecke.length - 1].cache_control = { type: "ephemeral" };
  return bloecke;
}

export function textAus(msg: Anthropic.Message): string {
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

export function pruefeStopp(msg: { stop_reason: string | null }, was: string): void {
  if (msg.stop_reason === "refusal") throw new Error(`${was}: Claude hat die Anfrage abgelehnt.`);
  if (msg.stop_reason === "max_tokens") throw new Error(`${was}: Antwort wurde abgeschnitten (max_tokens).`);
}
