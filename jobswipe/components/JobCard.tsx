import type { Job } from "@/lib/types";
import { IconAchtung, IconExtern, IconHaken, IconInfo, IconKalender, IconOrt, IconUhr } from "./Icons";

export function scoreKlasse(score: number | null): string {
  if ((score ?? 0) >= 75) return "score score-hoch";
  if ((score ?? 0) >= 55) return "score score-mittel";
  return "score";
}

/** Inhalt einer Stellenkarte. Die Geste liegt in SwipeDeck. */
export function JobCardInhalt({ job }: { job: Job }) {
  return (
    <>
      <div className="karte-kopf">
        <div className="karte-zeile">
          <span className="chip" title={job.quellen.join(", ")}>
            {job.quelle}
            {job.quellen.length > 1 ? ` +${job.quellen.length - 1}` : ""}
          </span>
          <div className={scoreKlasse(job.score)} aria-label={`Score ${job.score ?? "?"} von 100`}>
            {job.score ?? "?"}
            <small>SCORE</small>
          </div>
        </div>
        <p className="firma">{job.firma}</p>
        <h2 className="titel">{job.titel}</h2>
        <div className="meta">
          {job.ort && (
            <span>
              <IconOrt />
              {job.ort}
            </span>
          )}
          {job.pensum && (
            <span>
              <IconUhr />
              {job.pensum}
            </span>
          )}
          <span>
            <IconKalender />
            {job.startdatum ?? "Start offen"}
          </span>
        </div>
      </div>

      <div className="karte-koerper">
        {job.gruende.length > 0 && (
          <>
            <p className="abschnitt-titel">Gründe dafür</p>
            <ul className="liste liste-gut">
              {job.gruende.map((g) => (
                <li key={g}>
                  <IconHaken />
                  {g}
                </li>
              ))}
            </ul>
          </>
        )}
        {job.red_flags.length > 0 && (
          <>
            <p className="abschnitt-titel">Red Flags</p>
            <ul className="liste liste-flag">
              {job.red_flags.map((f) => (
                <li key={f}>
                  <IconAchtung />
                  {f}
                </li>
              ))}
            </ul>
          </>
        )}
        {job.beschreibung && <p className="beschreibung ohne-abstand" style={{ color: "var(--mittel)", fontSize: 13 }}>{job.beschreibung.slice(0, 400)}</p>}
      </div>

      <div className="karte-fuss">
        <span className="chip chip-akzent">{job.kategorie ?? "Sonstiges"}</span>
        <span style={{ display: "flex", gap: 14, alignItems: "center" }}>
          {job.url && (
            <a
              className="link-extern"
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              Anzeige
              <IconExtern />
            </a>
          )}
          <span className="link-extern" aria-hidden>
            <IconInfo />
          </span>
        </span>
      </div>
    </>
  );
}
