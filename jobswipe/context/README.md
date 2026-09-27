# Kontextdateien

Dieser Ordner ist nur der **lokale Fallback** für die Entwicklung. Alles ausser dieser README ist gitignoriert,
weil das Repository öffentlich ist.

Lege hier (lokal) oder im privaten Supabase-Bucket `context` (Produktion) diese Dateien ab, unverändert benannt:

- `Lang_Julian_Lebenslauf.pdf` (wird jeder Bewerbung angehängt)
- `Julian_Lang_Sprach_CI.pdf` (Ton, Vokabular, Negativliste)
- `Julian_Lang_Karriereprofil_CI_fuer_Claude.pdf` (verbindliche Faktenbasis)
- optional `Beispiel_Motivationsschreiben.pdf` (ein gelungenes Schreiben als Stilreferenz)

Die App lädt sie bei jeder Generierung zur Laufzeit. Zum Ersetzen einfach die Datei austauschen.
