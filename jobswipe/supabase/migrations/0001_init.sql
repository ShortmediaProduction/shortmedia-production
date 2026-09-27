-- JobSwipe: Grundschema
-- Alle Tabellen haben RLS aktiv und KEINE Policies: Browser-Clients (anon key) sehen nichts.
-- Die App greift ausschliesslich serverseitig mit dem Service-Role-Key zu, nachdem
-- sie geprüft hat, dass der eingeloggte Account der erlaubte Account ist.

create extension if not exists pgcrypto;

create table if not exists jobs (
  id              uuid primary key default gen_random_uuid(),
  quelle          text not null,                 -- z. B. "jobs.ch (Alert)", "LinkedIn (Alert)", "Karriereseite: Milan Film"
  url             text,
  firma           text not null,
  titel           text not null,
  ort             text,
  pensum          text,
  startdatum      text,
  beschreibung    text,
  kontakt         text,                          -- Kontaktperson aus der Anzeige
  email           text,                          -- Bewerbungsadresse, falls gefunden
  bewerbungsweg   text check (bewerbungsweg in ('email', 'portal', 'unklar')),
  portal_url      text,
  firma_website   text,
  score           int check (score between 0 and 100),
  kategorie       text,
  gruende         jsonb not null default '[]'::jsonb,
  red_flags       jsonb not null default '[]'::jsonb,
  scoring_status  text not null default 'offen' check (scoring_status in ('offen', 'fertig', 'fehler')),
  scoring_fehler  text,
  dedupe_key      text not null,
  quellen         jsonb not null default '[]'::jsonb,  -- alle Quellen, in denen die Stelle auftauchte
  erstellt_am     timestamptz not null default now()
);
create unique index if not exists jobs_dedupe_key_idx on jobs (dedupe_key);
create index if not exists jobs_scoring_status_idx on jobs (scoring_status);
create index if not exists jobs_score_idx on jobs (score desc);

create table if not exists swipes (
  id         uuid primary key default gen_random_uuid(),
  job_id     uuid not null references jobs(id) on delete cascade,
  richtung   text not null check (richtung in ('links', 'rechts', 'hoch')),
  grund      text,
  zeitpunkt  timestamptz not null default now()
);
create index if not exists swipes_job_idx on swipes (job_id);
create index if not exists swipes_zeitpunkt_idx on swipes (zeitpunkt desc);

create table if not exists applications (
  id                uuid primary key default gen_random_uuid(),
  job_id            uuid not null references jobs(id) on delete cascade,
  status            text not null default 'in_arbeit'
                    check (status in ('in_arbeit', 'entwurf', 'versendet', 'absage', 'gespraech', 'fehler')),
  schritt           text,                        -- aktueller Pipeline-Schritt für die Anzeige
  fehler            text,
  empfaenger        text,
  betreff           text,
  anrede            text,
  anschreiben_text  text,
  mail_text         text,
  recherche         jsonb,                       -- belegte Fakten zur Firma mit Quellen-URL
  pruefung          jsonb,                       -- Ergebnis des Regel-Checks
  pdf_pfad          text,
  gmail_draft_id    text,
  ist_portal        boolean not null default false,
  erstellt_am       timestamptz not null default now(),
  aktualisiert_am   timestamptz not null default now()
);
create unique index if not exists applications_job_idx on applications (job_id);

create table if not exists settings (
  id            int primary key default 1 check (id = 1),
  regionen      jsonb not null default '["Basel", "Baselland", "Aargau", "Solothurn", "Zürich", "Bern", "Luzern"]'::jsonb,
  mindest_score int not null default 40 check (mindest_score between 0 and 100),
  kategorien    jsonb not null default '["Kamera-Department", "Videograf/Junior Filmmaker", "Produktionsassistenz", "Praktikum", "Post/Color", "Rental/Technik", "Agentur/Brand Content", "Sonstiges"]'::jsonb,
  web_quellen   jsonb not null default '[]'::jsonb,  -- [{name, url, typ: "seite" | "rss"}]
  letzter_lauf  timestamptz,
  lauf_log      jsonb
);
insert into settings (id) values (1) on conflict (id) do nothing;

-- Merkt sich, welche Alert-Mails und Webseiten-Stände schon verarbeitet wurden.
create table if not exists processed_items (
  key          text primary key,               -- "gmail:<messageId>" oder "web:<url>:<hash>"
  verarbeitet_am timestamptz not null default now()
);

-- OAuth-Token für Gmail (genau eine Zeile).
create table if not exists google_tokens (
  id             int primary key default 1 check (id = 1),
  email          text,
  refresh_token  text not null,
  aktualisiert_am timestamptz not null default now()
);

alter table jobs            enable row level security;
alter table swipes          enable row level security;
alter table applications    enable row level security;
alter table settings        enable row level security;
alter table processed_items enable row level security;
alter table google_tokens   enable row level security;

-- Private Storage-Buckets
insert into storage.buckets (id, name, public) values ('context', 'context', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('applications', 'applications', false) on conflict (id) do nothing;
