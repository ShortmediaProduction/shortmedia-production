"use client";
import { AnimatePresence, motion } from "motion/react";
import type { Job } from "@/lib/types";
import { IconExtern } from "./Icons";
import { JobCardInhalt } from "./JobCard";

const WEG: Record<string, string> = { email: "E-Mail", portal: "Portal", unklar: "unklar" };

/** Volle Anzeige als Bottom Sheet (Tippen auf die Karte). */
export function JobDetail({ job, onClose, aktionen }: { job: Job | null; onClose: () => void; aktionen?: React.ReactNode }) {
  return (
    <AnimatePresence>
      {job && (
        <>
          <motion.div className="sheet-hintergrund" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={`${job.titel} bei ${job.firma}`}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
          >
            <div className="sheet-griff" />
            <div style={{ display: "flex", flexDirection: "column", margin: "0 -20px" }}>
              <JobCardInhalt job={job} />
            </div>
            <dl className="tabelle">
              <dt>Bewerbung</dt>
              <dd>{WEG[job.bewerbungsweg ?? "unklar"]}{job.email ? `: ${job.email}` : ""}</dd>
              {job.portal_url && (
                <>
                  <dt>Portal</dt>
                  <dd><a href={job.portal_url} target="_blank" rel="noopener noreferrer">{job.portal_url}</a></dd>
                </>
              )}
              <dt>Kontakt</dt>
              <dd>{job.kontakt ?? "nicht genannt"}</dd>
              {job.firma_website && (
                <>
                  <dt>Website</dt>
                  <dd><a href={job.firma_website} target="_blank" rel="noopener noreferrer">{job.firma_website}</a></dd>
                </>
              )}
              <dt>Quellen</dt>
              <dd>{job.quellen.join(", ")}</dd>
            </dl>
            <p className="abschnitt-titel">Anzeige</p>
            <p className="beschreibung">{job.beschreibung ?? "Kein Anzeigentext gespeichert. Öffne die Originalanzeige."}</p>
            <div className="knopf-reihe" style={{ marginTop: 18 }}>
              {aktionen}
              {job.url && (
                <a className="knopf knopf-hell" href={job.url} target="_blank" rel="noopener noreferrer">
                  Originalanzeige <IconExtern className="" />
                </a>
              )}
              <button className="knopf knopf-hell" onClick={onClose}>Schliessen</button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
