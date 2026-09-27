"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, relativeZeit } from "@/lib/client";
import { STATUS_LABEL, type Application, type Job } from "@/lib/types";
import { JobDetail } from "./JobDetail";

type AppMitJob = Application & { job: Job };

export function Bewerbungen() {
  const [ansicht, setAnsicht] = useState<"bewerbungen" | "gemerkt">("bewerbungen");
  const [daten, setDaten] = useState<{ bewerbungen: AppMitJob[]; gemerkt: Job[] } | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [detail, setDetail] = useState<Job | null>(null);

  const laden = useCallback(async () => {
    try {
      setDaten(await api("/api/applications"));
      setFehler(null);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    laden();
  }, [laden]);

  // Solange etwas in Arbeit ist, regelmässig nachladen.
  const inArbeit = daten?.bewerbungen.some((b) => b.status === "in_arbeit");
  useEffect(() => {
    if (!inArbeit) return;
    const t = setInterval(laden, 4000);
    return () => clearInterval(t);
  }, [inArbeit, laden]);

  const entscheiden = async (job: Job, richtung: "rechts" | "links") => {
    setDetail(null);
    await api("/api/swipe", { method: "POST", json: { job_id: job.id, richtung } });
    await laden();
    if (richtung === "rechts") setAnsicht("bewerbungen");
  };

  return (
    <>
      <h1 className="seiten-titel">Bewerbungen</h1>
      <div className="segment" role="group" aria-label="Ansicht">
        <button aria-pressed={ansicht === "bewerbungen"} onClick={() => setAnsicht("bewerbungen")}>
          Bewerbungen{daten ? ` (${daten.bewerbungen.length})` : ""}
        </button>
        <button aria-pressed={ansicht === "gemerkt"} onClick={() => setAnsicht("gemerkt")}>
          Gemerkt{daten ? ` (${daten.gemerkt.length})` : ""}
        </button>
      </div>

      {fehler && <div className="warnung">{fehler}</div>}
      {!daten && !fehler && <p className="hinweis">lädt …</p>}

      {daten && ansicht === "bewerbungen" && (
        <>
          {daten.bewerbungen.length === 0 && (
            <div className="leer">
              <h2>Noch keine Bewerbungen</h2>
              <p>Swipe eine Stelle nach rechts. Die App schreibt dann Motivationsschreiben und Mail und legt den Entwurf in Gmail ab.</p>
            </div>
          )}
          {daten.bewerbungen.map((b) => (
            <Link key={b.id} href={`/bewerbungen/${b.id}`} className="zeile">
              <div className="zeile-text">
                <div className="zeile-titel">{b.job.firma}</div>
                <div className="zeile-sub">
                  {b.job.titel} · {b.status === "in_arbeit" ? (b.schritt ?? "in Arbeit") : relativeZeit(b.aktualisiert_am)}
                  {b.ist_portal && b.status !== "in_arbeit" ? " · Portal" : ""}
                </div>
                {b.status === "in_arbeit" && (
                  <div className="fortschritt">
                    <div />
                  </div>
                )}
              </div>
              <span className={`status status-${b.status}`}>{STATUS_LABEL[b.status]}</span>
            </Link>
          ))}
        </>
      )}

      {daten && ansicht === "gemerkt" && (
        <>
          {daten.gemerkt.length === 0 && (
            <div className="leer">
              <h2>Nichts gemerkt</h2>
              <p>Swipe eine Karte nach oben, um sie hier für später abzulegen.</p>
            </div>
          )}
          {daten.gemerkt.map((j) => (
            <button key={j.id} className="zeile" style={{ width: "100%", border: 0, textAlign: "left" }} onClick={() => setDetail(j)}>
              <div className="zeile-text">
                <div className="zeile-titel">{j.firma}</div>
                <div className="zeile-sub">
                  {j.titel}
                  {j.ort ? ` · ${j.ort}` : ""}
                </div>
              </div>
              <span className="status">{j.score}</span>
            </button>
          ))}
        </>
      )}

      <JobDetail
        job={detail}
        onClose={() => setDetail(null)}
        aktionen={
          detail ? (
            <>
              <button className="knopf knopf-akzent" onClick={() => entscheiden(detail, "rechts")}>Jetzt bewerben</button>
              <button className="knopf knopf-hell" onClick={() => entscheiden(detail, "links")}>Ablehnen</button>
            </>
          ) : null
        }
      />
    </>
  );
}
