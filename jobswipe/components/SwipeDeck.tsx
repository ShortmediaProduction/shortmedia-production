"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { animate, motion, useMotionValue, useTransform, type PanInfo } from "motion/react";
import { api, relativeZeit } from "@/lib/client";
import { ABLEHNUNGSGRUENDE, type Job, type Richtung } from "@/lib/types";
import { IconHerz, IconStern, IconX, IconZurueck } from "./Icons";
import { JobCardInhalt } from "./JobCard";
import { JobDetail } from "./JobDetail";
import { Kopfzeile } from "./TabBar";

const SCHWELLE_X = 110;
const SCHWELLE_Y = 120;
const TEMPO = 650;

type Toast =
  | { art: "links"; swipeId: string; grund: string | null }
  | { art: "rechts"; appId: string | null; firma: string }
  | { art: "hoch"; firma: string }
  | { art: "info"; text: string };

interface DeckAntwort {
  jobs: Job[];
  anzahl: number;
  ausgeblendet: number;
  letzter_lauf: string | null;
}

export function SwipeDeck() {
  const [stapel, setStapel] = useState<Job[]>([]);
  const [anzahl, setAnzahl] = useState(0);
  const [letzterLauf, setLetzterLauf] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);
  const [detail, setDetail] = useState<Job | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [kannZurueck, setKannZurueck] = useState(true);
  const [suchtGerade, setSuchtGerade] = useState(false);
  const beschaeftigt = useRef(false);
  const gesehen = useRef(new Set<string>());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-240, 0, 240], [-14, 0, 14]);
  const jaOpacity = useTransform(x, [30, SCHWELLE_X], [0, 1]);
  const neinOpacity = useTransform(x, [-SCHWELLE_X, -30], [1, 0]);
  const hochOpacity = useTransform(y, [-SCHWELLE_Y, -40], [1, 0]);
  const naechsteSkala = useTransform([x, y], ([vx, vy]: number[]) => 0.95 + Math.min(1, Math.hypot(vx, vy) / 180) * 0.05);

  const zeigeToast = useCallback((t: Toast, ms = 6000) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = setTimeout(() => setToast(null), ms);
  }, []);

  const laden = useCallback(async () => {
    try {
      const d = await api<DeckAntwort>("/api/deck");
      setAnzahl(d.anzahl);
      setLetzterLauf(d.letzter_lauf);
      setStapel((alt) => {
        const ids = new Set(alt.map((j) => j.id));
        const neu = d.jobs.filter((j) => !ids.has(j.id) && !gesehen.current.has(j.id));
        return [...alt, ...neu];
      });
      setFehler(null);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e));
    } finally {
      setLaedt(false);
    }
  }, []);

  useEffect(() => {
    laden();
  }, [laden]);

  useEffect(() => {
    if (!laedt && stapel.length > 0 && stapel.length < 4) laden();
  }, [stapel.length, laedt, laden]);

  const oben = stapel[0];

  const swipe = useCallback(
    async (richtung: Richtung, geste?: PanInfo) => {
      if (!oben || beschaeftigt.current) return;
      beschaeftigt.current = true;
      const job = oben;
      const breite = typeof window !== "undefined" ? window.innerWidth : 500;
      const ziel =
        richtung === "rechts" ? { x: breite * 1.3, y: geste?.offset.y ?? 40 } : richtung === "links" ? { x: -breite * 1.3, y: geste?.offset.y ?? 40 } : { x: geste?.offset.x ?? 0, y: -900 };
      await Promise.all([
        animate(x, ziel.x, { type: "tween", duration: 0.28, ease: "easeIn" }),
        animate(y, ziel.y, { type: "tween", duration: 0.28, ease: "easeIn" }),
      ]);
      gesehen.current.add(job.id);
      setStapel((s) => s.slice(1));
      setAnzahl((a) => Math.max(0, a - 1));
      x.set(0);
      y.set(0);
      beschaeftigt.current = false;
      setKannZurueck(true);

      try {
        const r = await api<{ swipe: { id: string }; application_id: string | null }>("/api/swipe", {
          method: "POST",
          json: { job_id: job.id, richtung },
        });
        if (richtung === "links") zeigeToast({ art: "links", swipeId: r.swipe.id, grund: null }, 7000);
        else if (richtung === "rechts") zeigeToast({ art: "rechts", appId: r.application_id, firma: job.firma });
        else zeigeToast({ art: "hoch", firma: job.firma }, 3000);
      } catch (e) {
        zeigeToast({ art: "info", text: `Swipe nicht gespeichert: ${e instanceof Error ? e.message : e}` });
        setStapel((s) => [job, ...s]);
      }
    },
    [oben, x, y, zeigeToast],
  );

  const zurueck = useCallback(async () => {
    if (beschaeftigt.current) return;
    beschaeftigt.current = true;
    try {
      const r = await api<{ job: Job | null; richtung?: Richtung }>("/api/swipe/undo", { method: "POST" });
      if (r.job) {
        gesehen.current.delete(r.job.id);
        const start = r.richtung === "rechts" ? 600 : r.richtung === "links" ? -600 : 0;
        x.set(start);
        y.set(r.richtung === "hoch" ? -700 : 0);
        setStapel((s) => [r.job!, ...s.filter((j) => j.id !== r.job!.id)]);
        setAnzahl((a) => a + 1);
        await Promise.all([animate(x, 0, { type: "spring", stiffness: 300, damping: 30 }), animate(y, 0, { type: "spring", stiffness: 300, damping: 30 })]);
        zeigeToast({ art: "info", text: r.richtung === "rechts" ? "Rückgängig. Bewerbung und Gmail-Entwurf wurden entfernt." : "Rückgängig gemacht." }, 3000);
      } else {
        setKannZurueck(false);
      }
    } catch (e) {
      zeigeToast({ art: "info", text: e instanceof Error ? e.message : String(e) });
    } finally {
      beschaeftigt.current = false;
    }
  }, [x, y, zeigeToast]);

  const grundSetzen = async (swipeId: string, grund: string) => {
    const neu = toast?.art === "links" && toast.grund === grund ? null : grund;
    zeigeToast({ art: "links", swipeId, grund: neu }, 2500);
    await api("/api/swipe", { method: "PATCH", json: { swipe_id: swipeId, grund: neu } }).catch(() => undefined);
  };

  // Tastatur: Pfeile zum Swipen, Backspace für Rückgängig, Enter für Details
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (detail || (e.target as HTMLElement)?.closest("input, textarea, select")) return;
      if (e.key === "ArrowRight") swipe("rechts");
      else if (e.key === "ArrowLeft") swipe("links");
      else if (e.key === "ArrowUp") swipe("hoch");
      else if (e.key === "Backspace") zurueck();
      else if (e.key === "Enter" && oben) setDetail(oben);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [swipe, zurueck, detail, oben]);

  const gezogen = useRef(false);
  const onDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;
    if (offset.x > SCHWELLE_X || velocity.x > TEMPO) swipe("rechts", info);
    else if (offset.x < -SCHWELLE_X || velocity.x < -TEMPO) swipe("links", info);
    else if (offset.y < -SCHWELLE_Y || velocity.y < -TEMPO) swipe("hoch", info);
    else {
      animate(x, 0, { type: "spring", stiffness: 500, damping: 32 });
      animate(y, 0, { type: "spring", stiffness: 500, damping: 32 });
    }
  };

  const suchen = async () => {
    setSuchtGerade(true);
    try {
      await api("/api/ingest", { method: "POST" });
      zeigeToast({ art: "info", text: "Suche läuft im Hintergrund. Neue Stellen erscheinen in ein paar Minuten." });
      setTimeout(laden, 60_000);
    } catch (e) {
      zeigeToast({ art: "info", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setSuchtGerade(false);
    }
  };

  return (
    <>
      <Kopfzeile rechts={laedt ? "lädt …" : `${anzahl} ${anzahl === 1 ? "Stelle" : "Stellen"}`} />
      <main className="inhalt">
        <div className="stapel-bereich">
          {fehler && !stapel.length ? (
            <div className="leer">
              <h2>Das hat nicht geklappt</h2>
              <p>{fehler}</p>
              <button className="knopf knopf-hell" onClick={laden}>Nochmals versuchen</button>
            </div>
          ) : !laedt && !oben ? (
            <div className="leer">
              <h2>Alles durchgeswipt</h2>
              <p>Neue Stellen kommen jeden Morgen um 06:00. Letzte Suche: {relativeZeit(letzterLauf)}.</p>
              <div className="knopf-reihe" style={{ justifyContent: "center", marginTop: 8 }}>
                <button className="knopf" onClick={suchen} disabled={suchtGerade}>Jetzt suchen</button>
                {kannZurueck && <button className="knopf knopf-hell" onClick={zurueck}>Letzten Swipe zurück</button>}
              </div>
            </div>
          ) : (
            <div className="stapel" aria-live="polite">
              {stapel.slice(0, 3).map((job, i) => {
                if (i === 0) {
                  return (
                    <motion.div
                      key={job.id}
                      className="karte karte-oben"
                      style={{ x, y, rotate, zIndex: 3 }}
                      drag
                      dragMomentum={false}
                      onPointerDown={() => (gezogen.current = false)}
                      onDragStart={() => (gezogen.current = true)}
                      onDragEnd={onDragEnd}
                      onClick={() => !gezogen.current && setDetail(job)}
                      role="group"
                      aria-label={`${job.titel} bei ${job.firma}, Score ${job.score}`}
                    >
                      <motion.div className="stempel stempel-rechts" style={{ opacity: jaOpacity }}>Bewerben</motion.div>
                      <motion.div className="stempel stempel-links" style={{ opacity: neinOpacity }}>Nein</motion.div>
                      <motion.div className="stempel stempel-hoch" style={{ opacity: hochOpacity }}>Merken</motion.div>
                      <JobCardInhalt job={job} />
                    </motion.div>
                  );
                }
                return (
                  <motion.div
                    key={job.id}
                    className="karte"
                    aria-hidden
                    style={{ zIndex: 3 - i, scale: i === 1 ? naechsteSkala : 0.9, y: i === 1 ? 0 : 10 }}
                  >
                    <JobCardInhalt job={job} />
                  </motion.div>
                );
              })}
            </div>
          )}

          <div className="aktionen">
            <button className="rund rund-klein rund-zurueck" onClick={zurueck} disabled={!kannZurueck} aria-label="Letzten Swipe rückgängig machen" title="Rückgängig (Backspace)">
              <IconZurueck />
            </button>
            <button className="rund rund-gross rund-nein" onClick={() => swipe("links")} disabled={!oben} aria-label="Ablehnen" title="Ablehnen (Pfeil links)">
              <IconX />
            </button>
            <button className="rund rund-klein rund-merken" onClick={() => swipe("hoch")} disabled={!oben} aria-label="Für später merken" title="Merken (Pfeil hoch)">
              <IconStern />
            </button>
            <button className="rund rund-gross rund-ja" onClick={() => swipe("rechts")} disabled={!oben} aria-label="Bewerben" title="Bewerben (Pfeil rechts)">
              <IconHerz />
            </button>
          </div>
        </div>
      </main>

      {toast && (
        <div className={toast.art === "links" ? "toast toast-oben" : "toast"} role="status">
          {toast.art === "links" && (
            <>
              Abgelehnt. Grund (optional):
              <div className="toast-chips">
                {ABLEHNUNGSGRUENDE.map((g) => (
                  <button key={g} aria-pressed={toast.grund === g} onClick={() => grundSetzen(toast.swipeId, g)}>
                    {g}
                  </button>
                ))}
              </div>
            </>
          )}
          {toast.art === "rechts" && (
            <>
              Bewerbung für {toast.firma} wird erstellt.{" "}
              {toast.appId && <Link href={`/bewerbungen/${toast.appId}`}>Ansehen</Link>}
            </>
          )}
          {toast.art === "hoch" && <>{toast.firma} gemerkt. Du findest sie unter Bewerbungen.</>}
          {toast.art === "info" && toast.text}
        </div>
      )}

      <JobDetail
        job={detail}
        onClose={() => setDetail(null)}
        aktionen={
          detail && detail.id === oben?.id ? (
            <>
              <button className="knopf knopf-akzent" onClick={() => { setDetail(null); swipe("rechts"); }}>Bewerben</button>
              <button className="knopf knopf-hell" onClick={() => { setDetail(null); swipe("links"); }}>Ablehnen</button>
            </>
          ) : null
        }
      />
    </>
  );
}
