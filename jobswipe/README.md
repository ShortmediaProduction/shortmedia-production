# JobSwipe

Private, mobile-first Web-App: sammelt jeden Morgen neue Stellen aus der Schweiz, bewertet sie mit Claude gegen dein Karriereprofil und zeigt sie als Kartenstapel wie bei Tinder. Nach rechts swipen erstellt eine komplette Bewerbung und legt sie als **Entwurf** in Gmail ab. Die App versendet nie selbst.

| Geste | Aktion |
|---|---|
| nach rechts / ♥ / Pfeil rechts | bewerben (Recherche, Motivationsschreiben-PDF, Mail, Gmail-Entwurf) |
| nach links / ✕ / Pfeil links | ablehnen, optional mit Grund-Chip |
| nach oben / ★ / Pfeil hoch | merken (Tab «Bewerbungen», Ansicht «Gemerkt») |
| ↶ / Backspace | letzten Swipe rückgängig (löscht bei «rechts» auch Bewerbung und Entwurf) |
| Tippen / Enter | volle Anzeige |

## Architektur

- **Next.js 16** (App Router, TypeScript) als PWA, Hosting auf **Vercel**
- **Vercel Cron** ruft `/api/cron/ingest` um 04:00 und 05:00 UTC auf. Der Handler prüft die Zürcher Zeit: um 06:00 Zürich wird alles abgerufen (Sommer- und Winterzeit), der zweite Lauf bewertet nur Liegengebliebenes.
- **Supabase**: Postgres (`jobs`, `swipes`, `applications`, `settings`, plus `processed_items` und `google_tokens`), Storage (private Buckets `context` und `applications`), Auth per Magic Link. Alle Tabellen haben RLS ohne Policies, die App liest nur serverseitig mit dem Service-Role-Key, nachdem sie den Login geprüft hat.
- **Claude**: `claude-sonnet-5` für Scoring, Extraktion, Firmenrecherche (Websuche und Web-Fetch) und das Lektorat. `claude-opus-5-5` schreibt Motivationsschreiben und Mail. Die Kontext-PDFs gehen als Dokumente mit Prompt-Caching mit.
- **Gmail API** mit genau zwei Scopes: `gmail.readonly` (Alerts lesen) und `gmail.compose` (Entwürfe). Im Code gibt es keinen Sende-Aufruf.
- **PDF** serverseitig mit `@react-pdf/renderer` in deiner CI (Poppins, `#F5551E`, `#232323`, …)

```
Alerts (Gmail-Label) ─┐                        ┌─> Swipe-UI ──rechts──> Recherche ─> Schreiben ─> Regel-Check ─> PDF ─> Gmail-Entwurf
Karriereseiten / RSS ─┴─> Parser ─> Duplikate ─> Scoring ─┘                               ▲             │
                                                                                          └─neu (max 3)─┘
```

### Jobquellen

**A. Job-Alert-Mails (Hauptquelle).** Für jede Plattform gibt es einen eigenen Parser in `lib/sources/parsers/`: LinkedIn, jobs.ch, jobup.ch, Indeed, JobScout24. Erkennt kein Parser die Mail oder findet er nichts, liest Claude die Stellen aus dem Mailtext (Quelle heisst dann «… (Alert, KI-gelesen)»). Detailseiten werden nur geholt, wenn robots.txt es erlaubt. LinkedIn, Indeed, Glassdoor und Xing werden **nie** abgerufen, von dort nutzt die App nur den Inhalt der Alert-Mail.

Neue Plattform ergänzen: Datei mit einem `AlertParser` in `lib/sources/parsers/` anlegen, in `parsers/index.ts` eintragen, Test mit einer anonymisierten echten Mail in `tests/` schreiben.

**B. Öffentliche Quellen.** Ich habe geprüft (September 2026):

| Quelle | Ergebnis |
|---|---|
| job-room.ch (SECO) | robots.txt verbietet `/job-search/`, die API gibt es nur für Vertragspartner. **Nicht eingebunden.** Stattdessen: Job-Alert von job-room per Mail einrichten, falls verfügbar. |
| FOCAL | Das «Anschlagbrett» enthält vor allem Kurse und Weiterbildungen, keinen Stellenfeed. Nicht fest eingebunden, kann aber als Karriereseite eingetragen werden. |
| Cinébulletin | Kein Stellen- oder RSS-Feed gefunden. |
| jobs.ch / jobup.ch / JobScout24 | Kein Scraping der Suche; nur Alerts per Mail plus erlaubte Detailseiten. |
| Karriereseiten von Produktionsfirmen | **Eingebunden** als Quelle vom Typ «Karriereseite»: die App lädt die Seite (robots.txt, 3 s Drosselung pro Host, eigener User-Agent), erkennt Änderungen per Hash und lässt Claude die Stellen herauslesen. |
| RSS-Feeds | **Eingebunden** als Quelle vom Typ «RSS». |

Quellen trägst du unter **Einstellungen → Öffentliche Quellen** ein.

**Duplikate:** gleiche Firma (ohne Rechtsform, Umlaute normalisiert) und gleicher oder ähnlicher Titel (ohne «(m/w/d)», «:in», Pensum; Jaccard ≥ 0,6) gelten als dieselbe Stelle. Die zusätzliche Quelle wird an der Stelle vermerkt.

### Scoring und Lernen

Jede neue Stelle wird gegen das Karriereprofil bewertet (Score, Kategorie, bis 3 Gründe, Red Flags, Bewerbungsweg, Kontaktperson). Bei jedem Aufruf gehen deine letzten 10 Rechts- und 10 Links-Swipes (inkl. Ablehnungsgrund) als Beispiele mit. Stellen unter dem Mindest-Score werden gespeichert, aber nicht angezeigt.

### Schreibregeln

Die harten Regeln stehen in `lib/writing/regeln.ts`. Sie werden in jeden Prompt eingebaut und nach jeder Generierung geprüft:

1. Regex: `ß`, Gedankenstriche (`–`, `—`, ` - `), «Kündigungsfrist», «RAW und LOG», «Longine» ohne s, Kündigung/IWF-Abgang, klassische Floskeln, exakter Verfügbarkeitssatz, Anrede-Format
2. Zweiter Claude-Call (Lektorat) gegen die Red Flags und die Negativliste im Sprach-CI, erfundene Fakten und austauschbare Formulierungen

Bei einem Verstoss wird mit den Fundstellen als Feedback neu generiert (max. 3 Versuche). Bleibt etwas übrig, zeigt die App eine Warnung in der Vorschau.

## Setup

### 1. Kontextdateien

Das Repo ist **öffentlich**, deshalb liegen Lebenslauf und Profile nicht im Code. Lade diese Dateien in Supabase Storage in den privaten Bucket `context` (Namen exakt so):

- `Lang_Julian_Lebenslauf.pdf`
- `Julian_Lang_Sprach_CI.pdf`
- `Julian_Lang_Karriereprofil_CI_fuer_Claude.pdf`
- optional `Beispiel_Motivationsschreiben.pdf` (z. B. das Milan-Film-Schreiben als Stilreferenz)

Zum Ersetzen einfach die Datei im Bucket überschreiben. Nach spätestens 10 Minuten nutzt die App die neue Version. Die Einstellungsseite zeigt, welche Dateien gefunden wurden.

### 2. Supabase

1. Projekt auf [supabase.com](https://supabase.com) anlegen (Region Zürich/Frankfurt).
2. **SQL Editor** → Inhalt von `supabase/migrations/0001_init.sql` ausführen. Das legt Tabellen und die Buckets `context` und `applications` an.
3. **Storage → context** → die PDFs aus Schritt 1 hochladen.
4. **Authentication → Providers → Email**: aktiv lassen. Unter **Authentication → URL Configuration** die Site URL auf deine Vercel-URL setzen und `https://<deine-url>/auth/callback` als Redirect URL eintragen.
5. **Project Settings → API**: `URL`, `anon key` und `service_role key` notieren.

### 3. Anthropic

Unter [console.anthropic.com](https://console.anthropic.com) einen API-Key anlegen. Die Kosten hängen von der Menge ab: Scoring ist pro Stelle günstig (das Profil wird gecacht), eine Bewerbung mit Recherche, Opus-Text, Lektorat und allfälligen Neuversuchen kostet deutlich mehr. Setz in der Console ein Monatslimit und beobachte die ersten Tage.

### 4. Google Cloud (Gmail)

1. [console.cloud.google.com](https://console.cloud.google.com) → neues Projekt «JobSwipe».
2. **APIs & Services → Library** → «Gmail API» aktivieren.
3. **OAuth consent screen**: User Type «External», App-Name «JobSwipe», deine Mail als Test-User eintragen. Scopes: `gmail.readonly` und `gmail.compose`. Im Status «Testing» laufen Refresh-Tokens nach 7 Tagen ab. Damit das nicht passiert, auf «In production» stellen (für eine private App mit einem Nutzer reicht das ohne Verifizierung; Google zeigt beim Verbinden einen Hinweis «nicht verifiziert», den du bestätigst).
4. **Credentials → Create credentials → OAuth client ID** → «Web application». Authorized redirect URI: `https://<deine-url>/api/google/callback` (lokal zusätzlich `http://localhost:3000/api/google/callback`).
5. Client-ID und Secret notieren.
6. Nach dem Deploy in der App: **Einstellungen → Gmail verbinden**.

### 5. Vercel

1. Repo in Vercel importieren, **Root Directory: `jobswipe`**.
2. Alle Variablen aus `.env.example` unter **Settings → Environment Variables** eintragen (`APP_URL` = deine Vercel-URL, `CRON_SECRET` = langer Zufallswert, z. B. `openssl rand -hex 32`).
3. Deploy. Der Cron aus `vercel.json` wird automatisch aktiv. Die Routen verlangen bis zu 300 s Laufzeit (`maxDuration`). Prüfe in Vercel, dass dein Plan das erlaubt; sonst die Werte in den Routen senken.
4. Auf dem iPhone die URL in Safari öffnen → Teilen → «Zum Home-Bildschirm».

### 6. Job-Alerts einrichten

Überall mit deiner Gmail-Adresse. Suchbegriffe z. B. «Kamera», «Kameraassistenz», «2nd AC», «Videograf», «Filmproduktion», «Produktionsassistenz», «Postproduktion», «Kameraverleih», «Praktikum Film», Region Nordwestschweiz, Zürich, Bern.

| Plattform | Wo | Absender (für den Filter) |
|---|---|---|
| LinkedIn | Jobs → Suche → «Job-Alert einrichten», täglich, per E-Mail | `jobalerts-noreply@linkedin.com` |
| jobs.ch | Suche → «Suchabo speichern», täglich | `@jobs.ch` |
| jobup.ch | Suche → «Alerte emploi», täglich | `@jobup.ch` |
| Indeed | Suche → «Job-Alert erhalten» | `@indeed.com` |
| JobScout24 | Suche → «Job-Abo» | `@jobscout24.ch` |

Dann in Gmail:

1. Label **`JobSwipe/Alerts`** anlegen (Label «JobSwipe», darin «Alerts»).
2. **Filter** erstellen: Von `jobalerts-noreply@linkedin.com OR @jobs.ch OR @jobup.ch OR @indeed.com OR @jobscout24.ch` → «Label anwenden: JobSwipe/Alerts» (optional «Posteingang überspringen»).

Die App liest jeden Morgen die Mails der letzten 7 Tage aus diesem Label und merkt sich, welche schon verarbeitet sind.

Neue Plattform ohne eigenen Parser? Einfach den Absender in den Filter aufnehmen, der Claude-Fallback liest die Mail trotzdem. Wenn eine Plattform regelmässig kommt, lohnt sich ein eigener Parser (billiger, stabiler).

## Lokal entwickeln

```bash
cd jobswipe
npm install
cp .env.example .env.local     # ausfüllen
npm run dev                    # http://localhost:3000
```

Ohne Supabase die Oberfläche ausprobieren: `DEMO_MODE=1 npm run dev`. Dann gibt es fünf erfundene Beispielstellen im Speicher, kein Login, kein Gmail. Mit `ANTHROPIC_API_KEY` und PDFs in `./context` funktioniert im Demo-Modus auch das Schreiben (nur der Gmail-Schritt schlägt fehl).

```bash
npm test          # Parser, Duplikate, Regel-Check, MIME, PDF, Cron-Zeit, Deck-Filter
npm run lint      # TypeScript
npm run build
```

## Dateien

```
app/                 Seiten (Swipen, Bewerbungen, Einstellungen, Login) und API-Routen
components/          SwipeDeck (Gesten), JobCard, JobDetail, BewerbungDetail, Einstellungen
lib/sources/         Gmail-Alerts, Parser pro Plattform, Karriereseiten/RSS, Claude-Extraktion
lib/scoring.ts       Bewertung mit Beispielen aus deinen Swipes
lib/writing/         Recherche, Generierung, harte Regeln und Lektorat
lib/pipeline.ts      alles nach dem Rechts-Swipe
lib/pdf/brief.tsx    Motivationsschreiben-PDF in CI
lib/gmail/           OAuth, Alerts lesen, Entwürfe (nie senden)
supabase/migrations  Datenbankschema
```
