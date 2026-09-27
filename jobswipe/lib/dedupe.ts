/**
 * Duplikaterkennung über Quellen hinweg: gleiche Firma und ähnlicher Titel = gleiche Stelle.
 * Der dedupe_key hat die Form "<firma-normalisiert>|<titel-normalisiert>".
 */

const RECHTSFORMEN =
  /\b(ag|gmbh|sa|sàrl|sarl|s\.a\.|s\.à\.r\.l\.|kg|klg|ltd|llc|inc|gmbh & co\. kg|genossenschaft|stiftung|verein|holding|group|gruppe|schweiz|switzerland|suisse)\b/g;

function basis(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // Akzente weg (ä -> a, é -> e)
    .replace(/ß/g, "ss");
}

export function normalisiereFirma(firma: string): string {
  return basis(firma)
    .replace(/\(.*?\)/g, " ")
    .replace(RECHTSFORMEN, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

const TITEL_RAUSCHEN = [
  /\((m|w|d|f|h|x|m\/w\/d|w\/m\/d|m\/w|w\/m|f\/m\/d|h\/f|f\/h|h\/f\/d|all genders?)\)/g,
  /\b(m|w|d|f|h)\s*\/\s*(m|w|d|f|h)(\s*\/\s*(m|w|d|x))?\b/g,
  /\d{1,3}\s*(-|–|bis)\s*\d{1,3}\s*%/g,
  /\d{1,3}\s*%/g,
  /:in\b|\*in\b|\/in\b|\(in\)|innen\b/g,
];

const STOPPWOERTER = new Set(["und", "oder", "der", "die", "das", "a", "an", "the", "for", "fur", "als", "in", "im", "mit", "de", "et", "la", "le", "du"]);

export function titelTokens(titel: string): string[] {
  let t = basis(titel);
  for (const re of TITEL_RAUSCHEN) t = t.replace(re, " ");
  return t
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w.length > 1 && !STOPPWOERTER.has(w));
}

export function normalisiereTitel(titel: string): string {
  return [...new Set(titelTokens(titel))].sort().join("-");
}

export function dedupeKey(firma: string, titel: string): string {
  return `${normalisiereFirma(firma)}|${normalisiereTitel(titel)}`;
}

/** Jaccard-Ähnlichkeit der Titel-Wörter (0..1). */
export function titelAehnlichkeit(a: string, b: string): number {
  const A = new Set(titelTokens(a));
  const B = new Set(titelTokens(b));
  if (A.size === 0 || B.size === 0) return 0;
  let schnitt = 0;
  for (const w of A) if (B.has(w)) schnitt++;
  return schnitt / (A.size + B.size - schnitt);
}

export const AEHNLICHKEITS_SCHWELLE = 0.6;

export function istDuplikat(a: { firma: string; titel: string }, b: { firma: string; titel: string }): boolean {
  if (normalisiereFirma(a.firma) !== normalisiereFirma(b.firma)) return false;
  if (normalisiereTitel(a.titel) === normalisiereTitel(b.titel)) return true;
  return titelAehnlichkeit(a.titel, b.titel) >= AEHNLICHKEITS_SCHWELLE;
}
