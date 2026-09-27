import { absender } from "@/lib/config";
import { db } from "@/lib/db";
import { KONTEXT, ladePflichtKontext } from "@/lib/context";
import { entwurfAktualisieren, entwurfAnlegen } from "@/lib/gmail/client";
import { renderBrief } from "@/lib/pdf/brief";
import { claudePruefung, generiereBewerbung, type Bewerbung } from "@/lib/writing/generieren";
import { recherchiereFirma } from "@/lib/writing/recherche";
import { pruefeBewerbung } from "@/lib/writing/regeln";
import type { Application, Job, Pruefung } from "@/lib/types";

const MAX_VERSUCHE = 3;

function dateiname(job: Job): string {
  const firma = job.firma.replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_|_$/g, "");
  return `Motivationsschreiben_${firma}_${absender.name.replace(/\s+/g, "_")}.pdf`;
}

export function mailMitSignatur(anrede: string, mailText: string): string {
  return `${anrede}\n\n${mailText.trim()}\n\nFreundliche Grüsse\n\n${absender.signatur}${absender.telefon && !absender.signatur.includes(absender.telefon) ? `\n${absender.telefon}` : ""}`;
}

/** Schreibt, prüft und generiert bei Verstoss neu (max. 3 Versuche). */
async function schreibenMitPruefung(job: Job, app: Application, setSchritt: (s: string) => Promise<void>) {
  const recherche = app.recherche ?? { website: null, fakten: [], aufhaenger: null };
  let feedback: string[] = [];
  let bewerbung: Bewerbung | null = null;
  let pruefung: Pruefung = { ok: false, versuche: 0, verstoesse: [] };
  for (let v = 1; v <= MAX_VERSUCHE; v++) {
    await setSchritt(v === 1 ? "Motivationsschreiben schreiben" : `Neu schreiben (Versuch ${v}, Regelverstoss)`);
    bewerbung = await generiereBewerbung(job, recherche, feedback);
    const regex = pruefeBewerbung(bewerbung);
    // Den teureren Claude-Check nur machen, wenn die harten Regeln schon stimmen.
    const lektorat = regex.length ? [] : (await setSchritt("Text prüfen"), await claudePruefung(bewerbung, job, recherche));
    feedback = [...regex, ...lektorat];
    pruefung = { ok: feedback.length === 0, versuche: v, verstoesse: feedback };
    if (pruefung.ok) break;
  }
  return { bewerbung: bewerbung!, pruefung };
}

/** PDF rendern, speichern und Gmail-Entwurf anlegen oder aktualisieren. */
export async function entwurfSchreiben(appId: string): Promise<void> {
  const repo = db();
  const app = await repo.getApplication(appId);
  if (!app) return;
  const job = await repo.getJob(app.job_id);
  if (!job || !app.anschreiben_text || !app.mail_text || !app.anrede) throw new Error("Bewerbung ist unvollständig.");

  await repo.updateApplication(appId, { schritt: "PDF erstellen" });
  const pdf = await renderBrief({
    firma: job.firma,
    kontakt: job.kontakt,
    ort: job.ort,
    untertitel: app.recherche?.untertitel ?? job.titel,
    anrede: app.anrede,
    text: app.anschreiben_text,
  });
  const pdfPfad = `${appId}.pdf`;
  await repo.upload("applications", pdfPfad, pdf, "application/pdf");

  await repo.updateApplication(appId, { schritt: "Gmail-Entwurf anlegen", pdf_pfad: pdfPfad });
  const [cv, efz] = await Promise.all([ladePflichtKontext("lebenslauf"), ladePflichtKontext("efz")]);
  const empfaenger = job.bewerbungsweg === "email" && job.email ? job.email : null;
  const entwurf = {
    an: empfaenger,
    betreff: app.betreff ?? `Bewerbung ${job.titel}`,
    text: mailMitSignatur(app.anrede, app.mail_text),
    anhaenge: [
      { dateiname: KONTEXT.lebenslauf, contentType: "application/pdf", daten: cv },
      { dateiname: dateiname(job), contentType: "application/pdf", daten: pdf },
      { dateiname: KONTEXT.efz, contentType: "application/pdf", daten: efz },
    ],
  };

  // Wurde der Swipe inzwischen rückgängig gemacht? Dann keinen Entwurf anlegen.
  const nochDa = await repo.getApplication(appId);
  if (!nochDa) return;
  const draftId = nochDa.gmail_draft_id ? await entwurfAktualisieren(nochDa.gmail_draft_id, entwurf) : await entwurfAnlegen(entwurf);

  const status = nochDa.status === "in_arbeit" || nochDa.status === "fehler" ? "entwurf" : nochDa.status;
  await repo.updateApplication(appId, { gmail_draft_id: draftId, empfaenger, ist_portal: !empfaenger, status, schritt: null, fehler: null });
}

/** Die ganze Kette nach einem Rechts-Swipe (oder «neu generieren»). */
export async function bewerbungErstellen(appId: string, { neuRecherchieren = false } = {}): Promise<void> {
  const repo = db();
  const setSchritt = async (schritt: string) => repo.updateApplication(appId, { schritt, status: "in_arbeit", fehler: null });
  try {
    let app = await repo.getApplication(appId);
    if (!app) return;
    const job = await repo.getJob(app.job_id);
    if (!job) throw new Error("Stelle nicht gefunden.");

    if (!app.recherche || neuRecherchieren) {
      await setSchritt("Firma recherchieren");
      const recherche = await recherchiereFirma(job);
      await repo.updateApplication(appId, { recherche });
      if (recherche.website && !job.firma_website) await repo.updateJob(job.id, { firma_website: recherche.website });
      app = { ...app, recherche };
    }

    const { bewerbung, pruefung } = await schreibenMitPruefung(job, app, setSchritt);
    if (!(await repo.getApplication(appId))) return; // rückgängig gemacht
    await repo.updateApplication(appId, {
      anrede: bewerbung.anrede,
      betreff: bewerbung.betreff,
      anschreiben_text: bewerbung.anschreiben,
      mail_text: bewerbung.mail_text,
      recherche: { ...app.recherche!, untertitel: bewerbung.untertitel },
      pruefung,
    });

    await entwurfSchreiben(appId);
  } catch (e) {
    const fehler = e instanceof Error ? e.message : String(e);
    if (await repo.getApplication(appId)) await repo.updateApplication(appId, { status: "fehler", fehler, schritt: null });
  }
}

/** Nach manueller Bearbeitung in der Vorschau: Regeln prüfen (nur Hinweis), PDF und Entwurf aktualisieren. */
export async function nachBearbeitungAktualisieren(appId: string, t: { anrede: string; betreff: string; anschreiben_text: string; mail_text: string }) {
  const repo = db();
  const verstoesse = pruefeBewerbung({ anrede: t.anrede, betreff: t.betreff, anschreiben: t.anschreiben_text, mail_text: t.mail_text });
  const alt = await repo.getApplication(appId);
  await repo.updateApplication(appId, {
    ...t,
    pruefung: { ok: verstoesse.length === 0, versuche: alt?.pruefung?.versuche ?? 0, verstoesse },
  });
  await entwurfSchreiben(appId);
}
