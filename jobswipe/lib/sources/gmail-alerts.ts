import { ladeAlertMails } from "@/lib/gmail/client";
import { htmlZuTextMitLinks } from "@/lib/fetcher";
import { db } from "@/lib/db";
import type { RawJob } from "@/lib/types";
import { parserFuer } from "./parsers";
import { extrahiereStellen } from "./claude-extract";

function absenderDomain(from: string): string {
  return from.match(/@([a-z0-9.-]+)/i)?.[1]?.toLowerCase() ?? "unbekannt";
}

/** Liest neue Alert-Mails aus dem Gmail-Label und gibt die gefundenen Stellen zurück. */
export async function stellenAusAlerts(log: (quelle: string, n: number) => void, fehler: string[]): Promise<RawJob[]> {
  const repo = db();
  const mails = await ladeAlertMails();
  const alle: RawJob[] = [];
  for (const mail of mails) {
    const key = `gmail:${mail.id}`;
    if (await repo.istVerarbeitet(key)) continue;
    try {
      const parser = parserFuer({ from: mail.from, subject: mail.subject });
      let jobs = parser ? parser.parse(mail.html, mail.text) : [];
      if (jobs.length === 0) {
        const quelle = `${parser?.quelle.replace(" (Alert)", "") ?? absenderDomain(mail.from)} (Alert, KI-gelesen)`;
        const text = mail.html ? htmlZuTextMitLinks(mail.html) : mail.text;
        jobs = await extrahiereStellen(text, quelle);
      }
      for (const j of jobs) log(j.quelle, 1);
      alle.push(...jobs);
      await repo.markiereVerarbeitet(key);
    } catch (e) {
      fehler.push(`Alert «${mail.subject}»: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return alle;
}
