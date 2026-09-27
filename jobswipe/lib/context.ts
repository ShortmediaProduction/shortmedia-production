import { db } from "@/lib/db";

/**
 * Kontextdateien werden zur Laufzeit geladen (Supabase Storage, Bucket "context";
 * im Demo-Modus lokal aus ./context). Nichts davon steht im Code, damit die Dateien
 * jederzeit ersetzt werden können.
 */
export const KONTEXT = {
  lebenslauf: process.env.CONTEXT_CV ?? "Lang_Julian_Lebenslauf.pdf",
  sprachCi: process.env.CONTEXT_SPRACH_CI ?? "Julian_Lang_Sprach_CI.pdf",
  karriereprofil: process.env.CONTEXT_KARRIEREPROFIL ?? "Julian_Lang_Karriereprofil_CI_fuer_Claude.pdf",
  efz: process.env.CONTEXT_EFZ ?? "Lang_Julian_EFZ_Mediamatiker.pdf",
  beispiel: process.env.CONTEXT_BEISPIEL ?? "Beispiel_Motivationsschreiben.pdf",
} as const;

export type KontextName = keyof typeof KONTEXT;

const CACHE_MS = 10 * 60 * 1000;
const cache = new Map<string, { data: Buffer | null; zeit: number }>();

export async function ladeKontext(name: KontextName): Promise<Buffer | null> {
  const datei = KONTEXT[name];
  const c = cache.get(datei);
  if (c && Date.now() - c.zeit < CACHE_MS) return c.data;
  const data = await db().download("context", datei);
  cache.set(datei, { data, zeit: Date.now() });
  return data;
}

export async function ladePflichtKontext(name: KontextName): Promise<Buffer> {
  const data = await ladeKontext(name);
  if (!data) throw new Error(`Kontextdatei fehlt: ${KONTEXT[name]} (Supabase-Bucket "context" oder lokal ./context)`);
  return data;
}

export async function kontextStatus(): Promise<Record<KontextName, boolean>> {
  const namen = Object.keys(KONTEXT) as KontextName[];
  const res = await Promise.all(namen.map(async (n) => [n, !!(await ladeKontext(n))] as const));
  return Object.fromEntries(res) as Record<KontextName, boolean>;
}
