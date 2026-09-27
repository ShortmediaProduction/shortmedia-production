/** Baut eine RFC-2822-Nachricht (multipart/mixed) für einen Gmail-Entwurf. */

export interface Anhang {
  dateiname: string;
  contentType: string;
  daten: Buffer;
}

export interface EntwurfDaten {
  an?: string | null;
  betreff: string;
  text: string;
  anhaenge: Anhang[];
}

/** RFC 2047 für Nicht-ASCII-Header (Umlaute im Betreff/Dateinamen). */
export function kodiereHeader(wert: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(wert)) return wert;
  return `=?UTF-8?B?${Buffer.from(wert, "utf8").toString("base64")}?=`;
}

function base64Zeilen(buf: Buffer): string {
  return buf.toString("base64").replace(/.{1,76}/g, "$&\r\n").trimEnd();
}

export function baueMime(d: EntwurfDaten, grenze = `jobswipe_${Date.now().toString(36)}`): string {
  const kopf = [
    d.an ? `To: ${d.an}` : null,
    `Subject: ${kodiereHeader(d.betreff)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${grenze}"`,
  ].filter(Boolean);

  const teile = [
    [
      `--${grenze}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      base64Zeilen(Buffer.from(d.text.replace(/\r?\n/g, "\r\n"), "utf8")),
    ].join("\r\n"),
    ...d.anhaenge.map((a) =>
      [
        `--${grenze}`,
        `Content-Type: ${a.contentType}; name="${kodiereHeader(a.dateiname)}"`,
        `Content-Disposition: attachment; filename="${kodiereHeader(a.dateiname)}"`,
        "Content-Transfer-Encoding: base64",
        "",
        base64Zeilen(a.daten),
      ].join("\r\n"),
    ),
  ];

  return `${kopf.join("\r\n")}\r\n\r\n${teile.join("\r\n")}\r\n--${grenze}--\r\n`;
}

export function base64Url(s: string): string {
  return Buffer.from(s, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
