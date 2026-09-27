"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, relativeZeit } from "@/lib/client";
import { STATUS_LABEL, type Application, type ApplicationStatus, type Job } from "@/lib/types";
import { IconExtern, IconPfeilLinks } from "./Icons";

type AppMitJob = Application & { job: Job };
type Texte = Pick<Application, "anrede" | "betreff" | "anschreiben_text" | "mail_text">;

const MANUELL: ApplicationStatus[] = ["entwurf", "versendet", "gespraech", "absage"];

export function BewerbungDetail({ id }: { id: string }) {
  const [app, setApp] = useState<AppMitJob | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [texte, setTexte] = useState<Texte | null>(null);
  const [bearbeitet, setBearbeitet] = useState(false);
  const [ansicht, setAnsicht] = useState<"mail" | "schreiben">("mail");

  const laden = useCallback(async () => {
    try {
      const a = await api<AppMitJob>(`/api/applications/${id}`);
      setApp(a);
      setFehler(null);
      setTexte((alt) => (bearbeitet && alt ? alt : { anrede: a.anrede, betreff: a.betreff, anschreiben_text: a.anschreiben_text, mail_text: a.mail_text }));
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e));
    }
  }, [id, bearbeitet]);

  useEffect(() => {
    laden();
  }, [laden]);

  const inArbeit = app?.status === "in_arbeit";
  useEffect(() => {
    if (!inArbeit) return;
    const t = setInterval(laden, 3000);
    return () => clearInterval(t);
  }, [inArbeit, laden]);

  const aendere = (k: keyof Texte, v: string) => {
    setTexte((t) => (t ? { ...t, [k]: v } : t));
    setBearbeitet(true);
  };

  const neuGenerieren = async (neuRecherchieren: boolean) => {
    if (bearbeitet && !confirm("Deine Änderungen gehen verloren. Trotzdem neu generieren?")) return;
    setBearbeitet(false);
    await api(`/api/applications/${id}/regenerate`, { method: "POST", json: { neuRecherchieren } });
    await laden();
  };

  const entwurfAktualisieren = async () => {
    if (!texte) return;
    await api(`/api/applications/${id}`, { method: "PUT", json: texte });
    setBearbeitet(false);
    setApp((a) => (a ? { ...a, status: "in_arbeit", schritt: "Entwurf aktualisieren" } : a));
    setTimeout(laden, 1500);
  };

  const statusSetzen = async (status: ApplicationStatus) => {
    await api(`/api/applications/${id}`, { method: "PATCH", json: { status } });
    await laden();
  };

  if (fehler && !app) return <main className="inhalt"><div className="warnung">{fehler}</div></main>;
  if (!app || !texte) return <main className="inhalt"><p className="hinweis">lädt …</p></main>;
  const { job } = app;
  const fertig = !!app.mail_text;

  return (
    <>
      <header className="kopfzeile">
        <Link href="/bewerbungen" className="link-extern" style={{ color: "var(--text)" }}>
          <IconPfeilLinks /> Bewerbungen
        </Link>
        <span className={`status status-${app.status}`}>{STATUS_LABEL[app.status]}</span>
      </header>
      <main className="inhalt">
        <p className="firma" style={{ marginTop: 4 }}>{job.firma}</p>
        <h1 className="titel" style={{ marginBottom: 14 }}>{job.titel}</h1>

        {inArbeit && (
          <div className="block">
            <strong>{app.schritt ?? "In Arbeit"} …</strong>
            <p className="hinweis ohne-abstand">Recherche, Schreiben und Prüfung dauern meist ein bis drei Minuten.</p>
            <div className="fortschritt"><div /></div>
          </div>
        )}

        {app.status === "fehler" && (
          <div className="warnung">
            <strong>Fehler:</strong> {app.fehler}
            <div className="knopf-reihe" style={{ marginTop: 8 }}>
              <button className="knopf knopf-hell" onClick={() => neuGenerieren(false)}>Nochmals versuchen</button>
            </div>
          </div>
        )}

        {app.ist_portal && fertig && (
          <div className="block">
            <h2>Bewerbung über Portal</h2>
            <p className="ohne-abstand" style={{ fontSize: 14 }}>
              Keine E-Mail-Adresse in der Anzeige. Der Gmail-Entwurf hat keinen Empfänger. Lade das Schreiben im Portal hoch.
            </p>
            <div className="knopf-reihe" style={{ marginTop: 12 }}>
              {(job.portal_url ?? job.url) && (
                <a className="knopf" href={job.portal_url ?? job.url!} target="_blank" rel="noopener noreferrer">Zum Portal <IconExtern /></a>
              )}
            </div>
          </div>
        )}

        {app.pruefung && !app.pruefung.ok && app.pruefung.verstoesse.length > 0 && (
          <div className="warnung">
            <strong>Regel-Check nach {app.pruefung.versuche} Versuch{app.pruefung.versuche === 1 ? "" : "en"} nicht ganz sauber:</strong>
            <ul>
              {app.pruefung.verstoesse.map((v) => <li key={v}>{v}</li>)}
            </ul>
          </div>
        )}

        {fertig && (
          <>
            <div className="segment" role="group" aria-label="Vorschau">
              <button aria-pressed={ansicht === "mail"} onClick={() => setAnsicht("mail")}>E-Mail</button>
              <button aria-pressed={ansicht === "schreiben"} onClick={() => setAnsicht("schreiben")}>Motivationsschreiben</button>
            </div>

            <div className="block">
              <div className="feld">
                <label htmlFor="anrede">Anrede</label>
                <input id="anrede" className="eingabe" value={texte.anrede ?? ""} onChange={(e) => aendere("anrede", e.target.value)} />
              </div>
              {ansicht === "mail" ? (
                <>
                  <div className="feld">
                    <label htmlFor="empf">An</label>
                    <input id="empf" className="eingabe" value={app.empfaenger ?? "kein Empfänger (Portal)"} readOnly />
                  </div>
                  <div className="feld">
                    <label htmlFor="betreff">Betreff</label>
                    <input id="betreff" className="eingabe" value={texte.betreff ?? ""} onChange={(e) => aendere("betreff", e.target.value)} />
                  </div>
                  <div className="feld">
                    <label htmlFor="mail">Text (Grussformel und Signatur werden angehängt)</label>
                    <textarea id="mail" className="eingabe" rows={14} value={texte.mail_text ?? ""} onChange={(e) => aendere("mail_text", e.target.value)} />
                  </div>
                  <p className="hinweis ohne-abstand">Anhänge: Motivationsschreiben (PDF) und Lebenslauf (PDF)</p>
                </>
              ) : (
                <>
                  <div className="feld">
                    <label htmlFor="schreiben">Motivationsschreiben</label>
                    <textarea id="schreiben" className="eingabe" rows={22} value={texte.anschreiben_text ?? ""} onChange={(e) => aendere("anschreiben_text", e.target.value)} />
                  </div>
                  {app.pdf_pfad && (
                    <a className="knopf knopf-hell" href={`/api/applications/${id}/pdf?v=${encodeURIComponent(app.aktualisiert_am)}`} target="_blank" rel="noopener noreferrer">
                      PDF ansehen <IconExtern />
                    </a>
                  )}
                </>
              )}
            </div>

            <div className="knopf-reihe" style={{ marginBottom: 14 }}>
              <button className="knopf knopf-akzent" onClick={entwurfAktualisieren} disabled={!bearbeitet || inArbeit}>Entwurf aktualisieren</button>
              <button className="knopf knopf-hell" onClick={() => neuGenerieren(false)} disabled={inArbeit}>Neu generieren</button>
            </div>
          </>
        )}

        {app.recherche && (
          <div className="block">
            <h2>Recherche zur Firma</h2>
            {app.recherche.website && (
              <p className="ohne-abstand" style={{ fontSize: 14, marginBottom: 8 }}>
                <a href={app.recherche.website} target="_blank" rel="noopener noreferrer">{app.recherche.website}</a>
              </p>
            )}
            {app.recherche.fakten.length === 0 && <p className="hinweis">Keine belegten Fakten gefunden. Das Schreiben stützt sich nur auf die Anzeige.</p>}
            <ul className="liste liste-gut">
              {app.recherche.fakten.map((f) => (
                <li key={f.fakt} style={{ display: "block" }}>
                  {f.fakt}{" "}
                  <a href={f.quelle} target="_blank" rel="noopener noreferrer" className="hinweis">Quelle</a>
                </li>
              ))}
            </ul>
            <button className="knopf knopf-hell" onClick={() => neuGenerieren(true)} disabled={inArbeit}>Neu recherchieren und schreiben</button>
          </div>
        )}

        <div className="block">
          <h2>Status</h2>
          <div className="chipwahl">
            {MANUELL.map((s) => (
              <button key={s} aria-pressed={app.status === s} onClick={() => statusSetzen(s)} disabled={inArbeit}>
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <p className="hinweis" style={{ marginBottom: 0 }}>
            Erstellt {relativeZeit(app.erstellt_am)}. {app.gmail_draft_id ? "Entwurf liegt in Gmail." : ""} Die App versendet nie selbst.
          </p>
        </div>

        {job.url && (
          <a className="knopf knopf-hell" href={job.url} target="_blank" rel="noopener noreferrer">Originalanzeige <IconExtern /></a>
        )}
      </main>
    </>
  );
}
