/**
 * Harte Schreibregeln. Werden (1) in jeden Generierungs-Prompt eingebaut und (2) nach der
 * Generierung automatisch geprüft. Bei Verstoss wird neu generiert.
 */

export const VERFUEGBARKEITS_SATZ = "fest einsteigen könnte ich ab Januar 2027.";

export const HARTE_REGELN = `Harte Schreibregeln (ausnahmslos einhalten):
- Schweizer Hochdeutsch, immer «ss» statt «ß».
- Keine Gedankenstriche (weder «–» noch «—» noch « - » als Satzzeichen). Sätze stattdessen mit Punkt, Komma oder Doppelpunkt bauen.
- Keine künstlichen Dreieraufzählungen und keine Floskeln aus der Negativliste im Sprach-CI.
- Anrede: namentlich bekannte Person = «Guten Tag Herr Nachname,» bzw. «Guten Tag Frau Nachname,». Sonst «Guten Tag zusammen,».
- Verfügbarkeit immer mit genau diesem Satzteil: «${VERFUEGBARKEITS_SATZ}» Nie das Wort «Kündigungsfrist».
- Nie «in RAW und LOG» schreiben. Die RED Komodo-X dreht R3D RAW oder Proxy.
- Richtig schreiben: «Longines» (nicht «Longine»), auch wenn eine Quelle es anders schreibt.
- Keine erfundenen Fakten, Kunden, Credits oder Gemeinsamkeiten. Projekte der Firma nur nennen, wenn sie in den belegten Recherche-Fakten stehen.
- Den Abgang bei der IWF nie als Argument verwenden, keine Kündigung erwähnen. Die Rekrutenschule nur kurz als Übergang erwähnen.
- Der Text muss so spezifisch sein, dass man den Firmennamen nicht einfach austauschen könnte.`;

interface Regel {
  name: string;
  test: (text: string) => string | null;
}

const treffer = (re: RegExp, text: string) => text.match(re)?.[0] ?? null;

/** Klassische Bewerbungsfloskeln. Die individuelle Negativliste prüft der Claude-Check gegen das Sprach-CI. */
const FLOSKELN = [
  /hiermit bewerbe ich mich/i,
  /mit (grossem|großem|viel) interesse habe ich/i,
  /über eine einladung zu einem (persönlichen )?(vorstellungs)?gespräch (würde ich mich )?(sehr )?freuen/i,
  /teamplayer/i,
  /in einem dynamischen (umfeld|team)/i,
  /ich bin überzeugt, dass ich (eine )?(wertvolle|ideale)/i,
];

const REGELN: Regel[] = [
  { name: "«ß» statt «ss»", test: (t) => treffer(/ß/, t) },
  { name: "Gedankenstrich", test: (t) => treffer(/[–—]|\s-\s/, t) },
  { name: "Wort «Kündigungsfrist»", test: (t) => treffer(/kündigungsfrist/i, t) },
  { name: "«RAW und LOG»", test: (t) => treffer(/raw\s*(und|&|\/|and)\s*log/i, t) },
  { name: "«Longine» statt «Longines»", test: (t) => treffer(/\bLongine\b(?!s)/i, t) },
  { name: "IWF-Abgang/Kündigung erwähnt", test: (t) => treffer(/gekündigt|kündigung|entlassen|freigestellt|ohne mich (weiter)?geplant/i, t) },
  {
    name: "Floskel",
    test: (t) => {
      for (const re of FLOSKELN) {
        const m = treffer(re, t);
        if (m) return m;
      }
      return null;
    },
  },
];

export function pruefeAnrede(anrede: string): string | null {
  return /^Guten Tag (Herr|Frau) [^\s,]+( [^\s,]+)*,$|^Guten Tag zusammen,$/.test(anrede.trim())
    ? null
    : `Anrede «${anrede.trim()}» entspricht nicht «Guten Tag Herr/Frau X,» oder «Guten Tag zusammen,»`;
}

/** Prüft einen Text gegen die harten Regeln. Gibt eine Liste lesbarer Verstösse zurück. */
export function pruefeText(text: string, teil: string, { verfuegbarkeitPflicht = true } = {}): string[] {
  const verstoesse: string[] = [];
  for (const r of REGELN) {
    const m = r.test(text);
    if (m) verstoesse.push(`${teil}: ${r.name} («${m.trim()}»)`);
  }
  if (verfuegbarkeitPflicht && !text.includes(VERFUEGBARKEITS_SATZ)) {
    verstoesse.push(`${teil}: Verfügbarkeitssatz «${VERFUEGBARKEITS_SATZ}» fehlt oder ist abgewandelt`);
  }
  return verstoesse;
}

export function pruefeBewerbung(b: { anrede: string; anschreiben: string; mail_text: string; betreff: string }): string[] {
  return [
    ...[pruefeAnrede(b.anrede)].filter((x): x is string => !!x),
    ...pruefeText(b.betreff, "Betreff", { verfuegbarkeitPflicht: false }),
    ...pruefeText(b.anschreiben, "Motivationsschreiben"),
    ...pruefeText(b.mail_text, "E-Mail"),
  ];
}
