/** Stunde in Zürich (Vercel-Cron läuft in UTC). */
export function zuerichStunde(d = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Europe/Zurich" }).format(d));
}
