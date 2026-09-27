import { OAuth2Client } from "google-auth-library";
import { gmail as gmailFactory, type gmail_v1 } from "@googleapis/gmail";
import { env } from "@/lib/config";
import { db } from "@/lib/db";
import { baueMime, base64Url, type EntwurfDaten } from "./mime";

/**
 * Gmail-Zugriff nur mit den Scopes gmail.readonly (Alerts lesen) und gmail.compose (Entwürfe).
 * Diese App ruft NIEMALS messages.send oder drafts.send auf.
 */
export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
];

export function oauthClient(): OAuth2Client {
  if (!env.googleClientId || !env.googleClientSecret) throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET fehlen.");
  return new OAuth2Client({
    clientId: env.googleClientId,
    clientSecret: env.googleClientSecret,
    redirectUri: `${env.appUrl}/api/google/callback`,
  });
}

export function authUrl(state: string): string {
  return oauthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GMAIL_SCOPES,
    state,
    include_granted_scopes: false,
  });
}

export async function codeEinloesen(code: string): Promise<void> {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) throw new Error("Google hat kein Refresh-Token geliefert. Zugriff in Google-Konto entfernen und neu verbinden.");
  client.setCredentials(tokens);
  const profil = await gmailFactory({ version: "v1", auth: client }).users.getProfile({ userId: "me" });
  await db().saveGoogleToken(profil.data.emailAddress ?? null, tokens.refresh_token);
}

async function api(): Promise<gmail_v1.Gmail> {
  const token = await db().getGoogleToken();
  if (!token) throw new Error("Gmail ist nicht verbunden. In den Einstellungen «Gmail verbinden» wählen.");
  const client = oauthClient();
  client.setCredentials({ refresh_token: token.refresh_token });
  return gmailFactory({ version: "v1", auth: client });
}

export async function gmailVerbunden(): Promise<string | null | false> {
  const t = await db().getGoogleToken();
  return t ? t.email : false;
}

// ---------- Alert-Mails lesen ----------

export interface AlertMail {
  id: string;
  from: string;
  subject: string;
  html: string;
  text: string;
}

function dekodiere(data?: string | null): string {
  return data ? Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8") : "";
}

function sammleTeile(part: gmail_v1.Schema$MessagePart | undefined, out: { html: string; text: string }) {
  if (!part) return;
  if (part.mimeType === "text/html" && part.body?.data) out.html += dekodiere(part.body.data);
  else if (part.mimeType === "text/plain" && part.body?.data) out.text += dekodiere(part.body.data);
  for (const p of part.parts ?? []) sammleTeile(p, out);
}

export async function labelId(g: gmail_v1.Gmail, name: string): Promise<string | null> {
  const res = await g.users.labels.list({ userId: "me" });
  const l = res.data.labels?.find((x) => x.name?.toLowerCase() === name.toLowerCase());
  return l?.id ?? null;
}

export async function ladeAlertMails(tage = 7, max = 60): Promise<AlertMail[]> {
  const g = await api();
  const id = await labelId(g, env.gmailAlertLabel);
  if (!id) throw new Error(`Gmail-Label «${env.gmailAlertLabel}» existiert nicht. Bitte anlegen und Filter einrichten (siehe README).`);
  const liste = await g.users.messages.list({ userId: "me", labelIds: [id], q: `newer_than:${tage}d`, maxResults: max });
  const mails: AlertMail[] = [];
  for (const m of liste.data.messages ?? []) {
    if (!m.id) continue;
    const voll = await g.users.messages.get({ userId: "me", id: m.id, format: "full" });
    const header = (n: string) => voll.data.payload?.headers?.find((h) => h.name?.toLowerCase() === n)?.value ?? "";
    const teile = { html: "", text: "" };
    sammleTeile(voll.data.payload, teile);
    mails.push({ id: m.id, from: header("from"), subject: header("subject"), ...teile });
  }
  return mails;
}

// ---------- Entwürfe (nie senden) ----------

export async function entwurfAnlegen(d: EntwurfDaten): Promise<string> {
  const g = await api();
  const res = await g.users.drafts.create({ userId: "me", requestBody: { message: { raw: base64Url(baueMime(d)) } } });
  if (!res.data.id) throw new Error("Gmail hat keine Entwurfs-ID geliefert.");
  return res.data.id;
}

export async function entwurfAktualisieren(draftId: string, d: EntwurfDaten): Promise<string> {
  const g = await api();
  try {
    const res = await g.users.drafts.update({
      userId: "me",
      id: draftId,
      requestBody: { id: draftId, message: { raw: base64Url(baueMime(d)) } },
    });
    return res.data.id ?? draftId;
  } catch (e) {
    // Entwurf wurde in Gmail gelöscht oder schon versendet: neuen anlegen.
    if ((e as { code?: number }).code === 404) return entwurfAnlegen(d);
    throw e;
  }
}

export async function entwurfLoeschen(draftId: string): Promise<void> {
  const g = await api();
  try {
    await g.users.drafts.delete({ userId: "me", id: draftId });
  } catch (e) {
    if ((e as { code?: number }).code !== 404) throw e;
  }
}
