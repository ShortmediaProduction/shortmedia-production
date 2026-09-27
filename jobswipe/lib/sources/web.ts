import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import { AbrufVerboten, hoeflichAbrufen, htmlZuText, htmlZuTextMitLinks } from "@/lib/fetcher";
import { db } from "@/lib/db";
import type { RawJob, WebQuelle } from "@/lib/types";
import { extrahiereStellen } from "./claude-extract";

/**
 * Öffentliche Quellen: Karriereseiten von Produktionsfirmen und RSS-Feeds, die in den Einstellungen
 * eingetragen sind. robots.txt wird respektiert, Abrufe sind gedrosselt (siehe lib/fetcher.ts).
 */
export async function stellenAusWebQuellen(
  quellen: WebQuelle[],
  log: (quelle: string, n: number) => void,
  fehler: string[],
): Promise<RawJob[]> {
  const repo = db();
  const alle: RawJob[] = [];
  for (const q of quellen) {
    try {
      const { text, finalUrl } = await hoeflichAbrufen(q.url);
      const hash = createHash("sha1").update(text).digest("hex").slice(0, 16);
      const key = `web:${q.url}:${hash}`;
      if (await repo.istVerarbeitet(key)) continue; // Seite unverändert seit letztem Lauf
      const quelle = q.typ === "rss" ? `RSS: ${q.name}` : `Karriereseite: ${q.name}`;
      const jobs = q.typ === "rss" ? parseRss(text, quelle, q.name) : await extrahiereStellen(absolutiereLinks(htmlZuTextMitLinks(text), finalUrl), quelle, q.name);
      for (const j of jobs) log(quelle, 1);
      alle.push(...jobs);
      await repo.markiereVerarbeitet(key);
    } catch (e) {
      const m = e instanceof AbrufVerboten ? `übersprungen, ${e.message}` : e instanceof Error ? e.message : String(e);
      fehler.push(`${q.name}: ${m}`);
    }
  }
  return alle;
}

function absolutiereLinks(text: string, basis: string): string {
  return text.replace(/\[(\/[^\]\s]*)\]/g, (_, p) => {
    try {
      return `[${new URL(p, basis).toString()}]`;
    } catch {
      return `[${p}]`;
    }
  });
}

export function parseRss(xml: string, quelle: string, firmaStandard: string): RawJob[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const doc = parser.parse(xml);
  const items: Record<string, unknown>[] = [doc?.rss?.channel?.item ?? doc?.feed?.entry ?? []].flat();
  return items
    .map((it) => {
      const link = typeof it.link === "string" ? it.link : ((it.link as { "@_href"?: string })?.["@_href"] ?? null);
      const beschreibung = String(it.description ?? it.summary ?? it["content:encoded"] ?? "");
      const autor = typeof it["dc:creator"] === "string" ? (it["dc:creator"] as string) : null;
      return {
        quelle,
        titel: String(it.title ?? "").trim(),
        firma: autor ?? firmaStandard,
        url: link,
        beschreibung: beschreibung ? htmlZuText(beschreibung, 15_000) : null,
      } satisfies RawJob;
    })
    .filter((j) => j.titel);
}
