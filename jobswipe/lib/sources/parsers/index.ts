import type { AlertParser, MailMeta } from "./util";
import { linkedinParser } from "./linkedin";
import { jobsChParser, jobupParser } from "./jobcloud";
import { indeedParser } from "./indeed";
import { jobscout24Parser } from "./jobscout24";

/**
 * Registrierte Parser. Neue Plattform ergänzen:
 * 1. Datei in lib/sources/parsers/ mit einem AlertParser anlegen (erkennt + parse)
 * 2. hier in die Liste eintragen
 * 3. Test mit einer echten (anonymisierten) Alert-Mail in tests/ ergänzen
 * Alles, was kein Parser erkennt oder woraus er nichts liest, geht an den Claude-Fallback.
 */
export const PARSER: AlertParser[] = [linkedinParser, jobsChParser, jobupParser, indeedParser, jobscout24Parser];

export function parserFuer(meta: MailMeta): AlertParser | null {
  return PARSER.find((p) => p.erkennt(meta)) ?? null;
}

export type { AlertParser, MailMeta } from "./util";
