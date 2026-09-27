import * as cheerio from "cheerio";
import type { RawJob } from "@/lib/types";

export interface MailMeta {
  from: string;
  subject: string;
}

export interface AlertParser {
  /** Anzeigename der Quelle, landet in jobs.quelle */
  quelle: string;
  erkennt(meta: MailMeta): boolean;
  parse(html: string, text: string): RawJob[];
}

/** Tracking-Redirects auflösen, soweit die Ziel-URL als Parameter mitkommt. */
export function entpackeUrl(href: string): string {
  let url = href.trim().replace(/&amp;/g, "&");
  for (let i = 0; i < 3; i++) {
    try {
      const u = new URL(url);
      const ziel = ["url", "u", "redirect", "redirect_url", "target", "dest", "destination", "link", "q"]
        .map((p) => u.searchParams.get(p))
        .find((v) => v && /^https?:\/\//i.test(v));
      if (!ziel) break;
      url = ziel;
    } catch {
      break;
    }
  }
  return url;
}

const RAUSCHEN = [
  /^(neu|new|nouveau|promoted|gesponsert|sponsored|top[- ]?job|featured)$/i,
  /^(jetzt bewerben|bewerben|apply( now)?|postuler|ansehen|view( job)?|details|mehr( erfahren)?|voir|stelle ansehen|job ansehen|alle jobs anzeigen|see all jobs)$/i,
  /^(easy apply|einfach bewerben|schnellbewerbung|candidature simplifiée|quick apply)$/i,
  /^(vor|il y a|posted)?\s*\d+\s*(tag|tagen|stunde|stunden|minute|minuten|woche|wochen|day|days|hour|hours|jour|jours|week|weeks)/i,
  /^(heute|gestern|today|yesterday|aujourd'hui|hier)$/i,
  /^\d{1,2}\.\d{1,2}\.(\d{2,4})?$/,
  /^[\s·•|\-–—]*$/,
  /^(aktiv rekrutierend|actively recruiting|recrute activement)$/i,
  /alumni|kontakte arbeiten|connections? work/i,
];

export function istRauschen(line: string): boolean {
  return RAUSCHEN.some((re) => re.test(line.trim()));
}

export function sauber(s: string | undefined | null): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

/** Alle sichtbaren Textstücke eines Elements, jedes Textknoten-Stück einzeln (inline oder Block egal). */
function textSegmente($: cheerio.CheerioAPI, el: cheerio.Cheerio<never>): string[] {
  const out: string[] = [];
  const walk = (nodes: ReturnType<cheerio.CheerioAPI["root"]>["0"][] | never[]) => {
    for (const n of nodes as { type: string; data?: string; name?: string; children?: never[] }[]) {
      if (n.type === "text") {
        const t = sauber(n.data);
        if (t) out.push(t);
      } else if (n.type === "tag" && n.name !== "script" && n.name !== "style" && n.children) {
        walk(n.children);
      }
    }
  };
  el.each((_, node) => walk([node as never]));
  return out;
}

export interface Treffer {
  id: string;
  url: string;
}

/**
 * Sammelt Stellen aus einer Alert-Mail anhand eines URL-Musters.
 * Für jeden Job-Link wird der umgebende Block gesucht und daraus Titel, Firma und Ort gelesen.
 */
export function extrahiereNachLinks(
  html: string,
  quelle: string,
  erkenneLink: (url: string) => Treffer | null,
): RawJob[] {
  const $ = cheerio.load(html);
  const gruppen = new Map<string, { url: string; els: cheerio.Cheerio<never>[] }>();

  $("a[href]").each((_, a) => {
    const t = erkenneLink(entpackeUrl($(a).attr("href") ?? ""));
    if (!t) return;
    const g = gruppen.get(t.id) ?? { url: t.url, els: [] };
    g.els.push($(a) as never);
    gruppen.set(t.id, g);
  });

  const jobs: RawJob[] = [];
  for (const [id, g] of gruppen) {
    // Titel = längster sinnvoller Linktext zu dieser Stelle
    const linkTexte = g.els.map((el) => sauber($(el).text())).filter((t) => t && !istRauschen(t));
    const titelKandidat = linkTexte.sort((a, b) => b.length - a.length)[0];

    // Umgebenden Block finden, der keine andere Stelle enthält
    let container = g.els[0] as cheerio.Cheerio<never>;
    let zeilen: string[] = [];
    for (let i = 0; i < 8; i++) {
      const parent = container.parent();
      if (!parent.length) break;
      const andereIds = new Set<string>();
      parent.find("a[href]").each((_, a) => {
        const t = erkenneLink(entpackeUrl($(a).attr("href") ?? ""));
        if (t && t.id !== id) andereIds.add(t.id);
      });
      if (andereIds.size > 0) break;
      container = parent as never;
      zeilen = textSegmente($, container).filter((l) => !istRauschen(l));
      if (zeilen.length >= 3) break;
    }

    const titel = titelKandidat ?? zeilen[0];
    if (!titel) continue;
    const rest = zeilen.filter((l) => l !== titel && !l.includes(titel));
    let firma = rest[0] ?? "";
    let ort = rest[1] ?? null;
    // "Firma · Ort" oder "Firma - Ort" in einer Zeile
    const geteilt = firma.split(/\s+[·•|]\s+|\s+[-–]\s+/);
    if (geteilt.length >= 2) {
      firma = geteilt[0];
      ort = geteilt.slice(1).join(", ");
    }
    if (!firma) continue;
    jobs.push({ quelle, url: g.url, titel: sauber(titel), firma: sauber(firma), ort: ort ? sauber(ort) : null });
  }
  return jobs;
}
