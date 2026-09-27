export const KATEGORIEN = [
  "Kamera-Department",
  "Videograf/Junior Filmmaker",
  "Produktionsassistenz",
  "Praktikum",
  "Post/Color",
  "Rental/Technik",
  "Agentur/Brand Content",
  "Sonstiges",
] as const;
export type Kategorie = (typeof KATEGORIEN)[number];

export type Bewerbungsweg = "email" | "portal" | "unklar";
export type Richtung = "links" | "rechts" | "hoch";
export type ApplicationStatus = "in_arbeit" | "entwurf" | "versendet" | "absage" | "gespraech" | "fehler";

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  in_arbeit: "In Arbeit",
  entwurf: "Entwurf in Gmail",
  versendet: "Versendet",
  absage: "Absage",
  gespraech: "Gespräch",
  fehler: "Fehler",
};

export const ABLEHNUNGSGRUENDE = [
  "zu weit weg",
  "falsche Richtung",
  "zu früh",
  "Pensum passt nicht",
  "Sprache",
  "Qualifikation fehlt",
  "Firma passt nicht",
] as const;

/** Eine Stelle, wie sie eine Quelle liefert, noch ohne Bewertung. */
export interface RawJob {
  quelle: string;
  url?: string | null;
  firma: string;
  titel: string;
  ort?: string | null;
  pensum?: string | null;
  startdatum?: string | null;
  beschreibung?: string | null;
  kontakt?: string | null;
  email?: string | null;
}

export interface Job extends RawJob {
  id: string;
  bewerbungsweg: Bewerbungsweg | null;
  portal_url: string | null;
  firma_website: string | null;
  score: number | null;
  kategorie: Kategorie | null;
  gruende: string[];
  red_flags: string[];
  scoring_status: "offen" | "fertig" | "fehler";
  scoring_fehler: string | null;
  dedupe_key: string;
  quellen: string[];
  erstellt_am: string;
}

export interface Swipe {
  id: string;
  job_id: string;
  richtung: Richtung;
  grund: string | null;
  zeitpunkt: string;
}

export interface Recherche {
  website: string | null;
  fakten: { fakt: string; quelle: string }[];
  aufhaenger: string | null;
  /** Zeile unter «Motivationsschreiben» im PDF, kommt aus der Generierung */
  untertitel?: string;
}

export interface Pruefung {
  ok: boolean;
  versuche: number;
  verstoesse: string[];
}

export interface Application {
  id: string;
  job_id: string;
  status: ApplicationStatus;
  schritt: string | null;
  fehler: string | null;
  empfaenger: string | null;
  betreff: string | null;
  anrede: string | null;
  anschreiben_text: string | null;
  mail_text: string | null;
  recherche: Recherche | null;
  pruefung: Pruefung | null;
  pdf_pfad: string | null;
  gmail_draft_id: string | null;
  ist_portal: boolean;
  erstellt_am: string;
  aktualisiert_am: string;
}

export interface WebQuelle {
  name: string;
  url: string;
  typ: "seite" | "rss";
}

export interface Settings {
  regionen: string[];
  mindest_score: number;
  kategorien: string[];
  web_quellen: WebQuelle[];
  letzter_lauf: string | null;
  lauf_log: IngestLog | null;
}

export interface IngestLog {
  start: string;
  ende?: string;
  neu: number;
  duplikate: number;
  bewertet: number;
  fehler: string[];
  quellen: Record<string, number>;
}
