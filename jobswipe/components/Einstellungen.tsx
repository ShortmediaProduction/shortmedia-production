"use client";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, relativeZeit } from "@/lib/client";
import { KATEGORIEN, type Settings, type WebQuelle } from "@/lib/types";

interface Status {
  demo: boolean;
  anthropic: boolean;
  google: boolean;
  gmail: string | null | false;
  kontext: Record<string, boolean>;
  absender: { name: string; telefon: boolean; email: boolean };
  alertLabel: string;
  modelle: { scoring: string; schreiben: string };
}

function Check({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <div className={`check ${ok ? "check-ok" : "check-fehlt"}`}>
      <span aria-hidden>{ok ? "✓" : "!"}</span>
      <span>{children}</span>
    </div>
  );
}

export function Einstellungen() {
  const params = useSearchParams();
  const [s, setS] = useState<Settings | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [neueRegion, setNeueRegion] = useState("");
  const [neueQuelle, setNeueQuelle] = useState<WebQuelle>({ name: "", url: "", typ: "seite" });
  const [gespeichert, setGespeichert] = useState(true);

  const laden = useCallback(async () => {
    const [settings, st] = await Promise.all([api<Settings>("/api/settings"), api<Status>("/api/status")]);
    setS(settings);
    setStatus(st);
  }, []);

  useEffect(() => {
    laden().catch((e) => setMeldung(String(e)));
    const g = params.get("gmail");
    if (g === "ok") setMeldung("Gmail ist verbunden.");
    if (g === "fehler") setMeldung(`Gmail-Verbindung fehlgeschlagen. ${params.get("info") ?? ""}`);
  }, [laden, params]);

  const aendern = (patch: Partial<Settings>) => {
    setS((alt) => (alt ? { ...alt, ...patch } : alt));
    setGespeichert(false);
  };

  const speichern = async () => {
    if (!s) return;
    try {
      const neu = await api<Settings>("/api/settings", {
        method: "PUT",
        json: { regionen: s.regionen, mindest_score: s.mindest_score, kategorien: s.kategorien, web_quellen: s.web_quellen },
      });
      setS(neu);
      setGespeichert(true);
      setMeldung("Gespeichert.");
    } catch (e) {
      setMeldung(e instanceof Error ? e.message : String(e));
    }
  };

  const suchen = async () => {
    await api("/api/ingest", { method: "POST" });
    setMeldung("Suche läuft im Hintergrund. Das dauert ein paar Minuten.");
  };

  if (!s || !status) return <p className="hinweis">{meldung ?? "lädt …"}</p>;

  return (
    <>
      <h1 className="seiten-titel">Einstellungen</h1>
      {meldung && <div className="warnung" role="status">{meldung}</div>}

      <section className="block">
        <h2>Suche</h2>
        <div className="feld">
          <label htmlFor="score">Mindest-Score: {s.mindest_score}</label>
          <input id="score" type="range" min={0} max={100} step={5} value={s.mindest_score} onChange={(e) => aendern({ mindest_score: Number(e.target.value) })} style={{ accentColor: "var(--akzent)" }} />
          <span className="hinweis">Stellen darunter werden gespeichert, aber nicht angezeigt.</span>
        </div>

        <div className="feld">
          <span className="label">Regionen</span>
          <div className="chipwahl">
            {s.regionen.map((r) => (
              <button key={r} aria-pressed onClick={() => aendern({ regionen: s.regionen.filter((x) => x !== r) })} aria-label={`${r} entfernen`}>
                {r} ×
              </button>
            ))}
          </div>
          <form
            style={{ display: "flex", gap: 8 }}
            onSubmit={(e) => {
              e.preventDefault();
              const r = neueRegion.trim();
              if (r && !s.regionen.includes(r)) aendern({ regionen: [...s.regionen, r] });
              setNeueRegion("");
            }}
          >
            <input className="eingabe" placeholder="Region hinzufügen, z. B. Remote" value={neueRegion} onChange={(e) => setNeueRegion(e.target.value)} />
            <button className="knopf knopf-hell" type="submit">+</button>
          </form>
          <span className="hinweis">Fliesst ins Scoring ein. Stellen ausserhalb bekommen den Red Flag «Umzug nötig».</span>
        </div>

        <div className="feld">
          <span className="label">Kategorien im Stapel</span>
          <div className="chipwahl">
            {KATEGORIEN.map((k) => {
              const an = s.kategorien.includes(k);
              return (
                <button key={k} aria-pressed={an} onClick={() => aendern({ kategorien: an ? s.kategorien.filter((x) => x !== k) : [...s.kategorien, k] })}>
                  {k}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="block">
        <h2>Öffentliche Quellen</h2>
        <p className="hinweis" style={{ marginTop: 0 }}>
          Karriereseiten von Produktionsfirmen oder RSS-Feeds. Die App respektiert robots.txt, ruft höchstens alle 3 Sekunden pro Seite ab und liest die Stellen mit Claude heraus. LinkedIn, Indeed und Co. werden nie direkt abgerufen.
        </p>
        {s.web_quellen.map((q, i) => (
          <div key={q.url} className="zeile" style={{ background: "var(--grund)" }}>
            <div className="zeile-text">
              <div className="zeile-titel">{q.name}</div>
              <div className="zeile-sub">{q.typ === "rss" ? "RSS · " : ""}{q.url}</div>
            </div>
            <button className="knopf knopf-hell" style={{ minHeight: 34, padding: "0 10px" }} onClick={() => aendern({ web_quellen: s.web_quellen.filter((_, j) => j !== i) })} aria-label={`${q.name} entfernen`}>
              ×
            </button>
          </div>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!neueQuelle.name.trim() || !/^https?:\/\//.test(neueQuelle.url)) return setMeldung("Name und eine URL mit https:// angeben.");
            aendern({ web_quellen: [...s.web_quellen, { ...neueQuelle, name: neueQuelle.name.trim(), url: neueQuelle.url.trim() }] });
            setNeueQuelle({ name: "", url: "", typ: "seite" });
          }}
        >
          <div className="feld" style={{ marginTop: 10 }}>
            <input className="eingabe" placeholder="Name, z. B. Milan Film Jobs" value={neueQuelle.name} onChange={(e) => setNeueQuelle({ ...neueQuelle, name: e.target.value })} />
            <input className="eingabe" placeholder="https://…" inputMode="url" value={neueQuelle.url} onChange={(e) => setNeueQuelle({ ...neueQuelle, url: e.target.value })} />
            <select className="eingabe" value={neueQuelle.typ} onChange={(e) => setNeueQuelle({ ...neueQuelle, typ: e.target.value as WebQuelle["typ"] })}>
              <option value="seite">Karriereseite (Claude liest die Stellen)</option>
              <option value="rss">RSS-Feed</option>
            </select>
            <button className="knopf knopf-hell" type="submit">Quelle hinzufügen</button>
          </div>
        </form>
      </section>

      <div className="knopf-reihe" style={{ marginBottom: 14 }}>
        <button className="knopf knopf-akzent" onClick={speichern} disabled={gespeichert}>Speichern</button>
        <button className="knopf knopf-hell" onClick={suchen}>Jetzt nach Stellen suchen</button>
      </div>

      <section className="block">
        <h2>Letzter Lauf</h2>
        {s.lauf_log ? (
          <>
            <p className="ohne-abstand" style={{ fontSize: 14 }}>
              {relativeZeit(s.letzter_lauf)}: {s.lauf_log.neu} neu, {s.lauf_log.duplikate} Duplikate, {s.lauf_log.bewertet} bewertet.
            </p>
            {Object.keys(s.lauf_log.quellen).length > 0 && (
              <p className="hinweis">{Object.entries(s.lauf_log.quellen).map(([q, n]) => `${q}: ${n}`).join(" · ")}</p>
            )}
            {s.lauf_log.fehler.length > 0 && (
              <div className="warnung">
                <ul>{s.lauf_log.fehler.slice(0, 10).map((f) => <li key={f}>{f}</li>)}</ul>
              </div>
            )}
          </>
        ) : (
          <p className="hinweis">Noch kein Lauf. Automatisch täglich um 06:00.</p>
        )}
      </section>

      <section className="block">
        <h2>Verbindungen</h2>
        {status.demo && <div className="warnung">Demo-Modus: Daten liegen nur im Speicher, Gmail ist deaktiviert.</div>}
        <Check ok={status.anthropic}>Anthropic API-Key ({status.modelle.scoring} / {status.modelle.schreiben})</Check>
        <Check ok={status.google}>Google OAuth-Client</Check>
        <Check ok={!!status.gmail}>Gmail {status.gmail ? `verbunden als ${status.gmail}` : "nicht verbunden"}</Check>
        <p className="hinweis">Alerts werden aus dem Label «{status.alertLabel}» gelesen. Die App legt nur Entwürfe an und versendet nie.</p>
        {status.google && !status.demo && (
          <a className="knopf knopf-hell" href="/api/google/connect">{status.gmail ? "Gmail neu verbinden" : "Gmail verbinden"}</a>
        )}
      </section>

      <section className="block">
        <h2>Kontextdateien</h2>
        {Object.entries(status.kontext).map(([datei, ok]) => (
          <Check key={datei} ok={ok}>{datei}{datei.startsWith("Beispiel") && !ok ? " (optional)" : ""}</Check>
        ))}
        <Check ok={status.absender.telefon && status.absender.email}>Absenderdaten (Telefon, E-Mail) für PDF und Signatur</Check>
        <p className="hinweis" style={{ marginBottom: 0 }}>Dateien liegen im privaten Supabase-Bucket «context». Zum Ersetzen einfach die Datei dort austauschen.</p>
      </section>

      <form action="/login/abmelden" method="post">
        <button className="knopf knopf-hell" type="submit" style={{ width: "100%" }}>Abmelden</button>
      </form>
    </>
  );
}
