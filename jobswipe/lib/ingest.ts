import { db } from "@/lib/db";
import { env, SCORE_BATCH_LIMIT } from "@/lib/config";
import { dedupeKey, istDuplikat, normalisiereFirma } from "@/lib/dedupe";
import { darfAbrufen, hoeflichAbrufen, htmlZuText } from "@/lib/fetcher";
import { bewerteOffene } from "@/lib/scoring";
import { stellenAusAlerts } from "@/lib/sources/gmail-alerts";
import { stellenAusWebQuellen } from "@/lib/sources/web";
import type { IngestLog, RawJob } from "@/lib/types";

/** Speichert eine Stelle, falls sie neu ist. Gibt false zurück, wenn es ein Duplikat war. */
export async function speichereStelle(raw: RawJob, detailsHolen: boolean): Promise<boolean> {
  const repo = db();
  const kandidaten = await repo.jobsMitFirmaKey(normalisiereFirma(raw.firma));
  const dup = kandidaten.find((k) => istDuplikat(k, raw));
  if (dup) {
    if (!dup.quellen.includes(raw.quelle)) await repo.updateJob(dup.id, { quellen: [...dup.quellen, raw.quelle] });
    return false;
  }
  let beschreibung = raw.beschreibung ?? null;
  if (!beschreibung && raw.url && detailsHolen && (await darfAbrufen(raw.url))) {
    try {
      beschreibung = htmlZuText((await hoeflichAbrufen(raw.url)).text, 15_000);
    } catch {
      // Detailseite nicht erreichbar: Stelle trotzdem speichern, Scoring arbeitet dann mit weniger Infos.
    }
  }
  await repo.insertJob({ ...raw, beschreibung, dedupe_key: dedupeKey(raw.firma, raw.titel), quellen: [raw.quelle] });
  return true;
}

export interface IngestOptionen {
  /** false = nur liegengebliebene Stellen bewerten, keine Quellen abrufen */
  quellenAbrufen: boolean;
  /** Zeitbudget in ms, danach wird abgebrochen und im nächsten Lauf weitergemacht */
  budgetMs: number;
}

export async function ingest({ quellenAbrufen, budgetMs }: IngestOptionen): Promise<IngestLog> {
  const repo = db();
  const deadline = Date.now() + budgetMs;
  const settings = await repo.getSettings();
  const log: IngestLog = { start: new Date().toISOString(), neu: 0, duplikate: 0, bewertet: 0, fehler: [], quellen: {} };
  const zaehle = (q: string, n: number) => (log.quellen[q] = (log.quellen[q] ?? 0) + n);

  if (quellenAbrufen) {
    const roh: RawJob[] = [];
    if (!env.demoMode) {
      try {
        roh.push(...(await stellenAusAlerts(zaehle, log.fehler)));
      } catch (e) {
        log.fehler.push(`Gmail: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    roh.push(...(await stellenAusWebQuellen(settings.web_quellen, zaehle, log.fehler)));

    for (const r of roh) {
      try {
        // Detailseiten nur holen, solange noch mindestens die Hälfte des Budgets übrig ist.
        const neu = await speichereStelle(r, Date.now() < deadline - budgetMs / 2);
        if (neu) log.neu++;
        else log.duplikate++;
      } catch (e) {
        log.fehler.push(`${r.firma} / ${r.titel}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  // Bewerten in Häppchen, bis das Zeitbudget aufgebraucht ist.
  while (Date.now() < deadline - 30_000) {
    const { bewertet, fehler } = await bewerteOffene(Math.min(5, SCORE_BATCH_LIMIT), settings);
    log.bewertet += bewertet;
    log.fehler.push(...fehler);
    if (bewertet + fehler.length === 0 || log.bewertet >= SCORE_BATCH_LIMIT) break;
  }

  log.ende = new Date().toISOString();
  await repo.updateSettings({ letzter_lauf: log.ende, lauf_log: log });
  return log;
}
