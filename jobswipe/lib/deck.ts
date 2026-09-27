import type { Job, Settings } from "@/lib/types";

/** Welche Stellen im Stapel landen: bewertet, über Mindest-Score, in erlaubter Kategorie. */
export function filtereDeck(jobs: Job[], settings: Settings): Job[] {
  const kategorien = new Set(settings.kategorien);
  return jobs
    .filter((j) => (j.score ?? 0) >= settings.mindest_score)
    .filter((j) => !j.kategorie || kategorien.has(j.kategorie))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.erstellt_am.localeCompare(a.erstellt_am));
}
