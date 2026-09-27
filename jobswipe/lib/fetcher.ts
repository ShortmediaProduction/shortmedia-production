import robotsParser from "robots-parser";
import { env } from "@/lib/config";

/**
 * Höflicher Abruf von Webseiten: robots.txt wird respektiert, pro Host wird gedrosselt,
 * und jeder Abruf trägt einen eindeutigen User-Agent.
 */

const MIN_ABSTAND_MS = 3000;
const letzterAbruf = new Map<string, number>();
const robotsCache = new Map<string, ReturnType<typeof robotsParser> | null>();

/** Hosts, deren AGB automatisierte Abrufe verbieten. Hier wird nie etwas geholt. */
const GESPERRTE_HOSTS = [/(^|\.)linkedin\.com$/i, /(^|\.)indeed\.(com|ch)$/i, /(^|\.)glassdoor\./i, /(^|\.)xing\.com$/i];

export function hostGesperrt(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return GESPERRTE_HOSTS.some((re) => re.test(host));
  } catch {
    return true;
  }
}

async function robotsFuer(url: URL) {
  const key = url.origin;
  if (robotsCache.has(key)) return robotsCache.get(key)!;
  let robots: ReturnType<typeof robotsParser> | null = null;
  try {
    const res = await fetch(`${key}/robots.txt`, {
      headers: { "User-Agent": env.userAgent },
      signal: AbortSignal.timeout(10_000),
    });
    // 4xx = keine robots.txt = alles erlaubt. 5xx/Netzfehler = vorsichtshalber nichts erlaubt.
    if (res.ok) robots = robotsParser(`${key}/robots.txt`, await res.text());
    else if (res.status >= 400 && res.status < 500) robots = robotsParser(`${key}/robots.txt`, "");
  } catch {
    robots = null;
  }
  robotsCache.set(key, robots);
  return robots;
}

export async function darfAbrufen(url: string): Promise<boolean> {
  if (hostGesperrt(url)) return false;
  const u = new URL(url);
  const robots = await robotsFuer(u);
  if (!robots) return false;
  return robots.isAllowed(url, env.userAgent) !== false;
}

async function drosseln(host: string) {
  const warte = (letzterAbruf.get(host) ?? 0) + MIN_ABSTAND_MS - Date.now();
  if (warte > 0) await new Promise((r) => setTimeout(r, warte));
  letzterAbruf.set(host, Date.now());
}

export class AbrufVerboten extends Error {}

export async function hoeflichAbrufen(url: string): Promise<{ text: string; contentType: string; finalUrl: string }> {
  if (!(await darfAbrufen(url))) throw new AbrufVerboten(`robots.txt oder AGB verbieten den Abruf von ${url}`);
  const u = new URL(url);
  await drosseln(u.host);
  const res = await fetch(url, {
    headers: { "User-Agent": env.userAgent, Accept: "text/html,application/xhtml+xml,application/rss+xml,application/xml;q=0.9,*/*;q=0.8" },
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} für ${url}`);
  return { text: await res.text(), contentType: res.headers.get("content-type") ?? "", finalUrl: res.url };
}

/** HTML grob zu lesbarem Text machen (für Claude). */
export function htmlZuText(html: string, maxZeichen = 40_000): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h\d|\/tr)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim()
    .slice(0, maxZeichen);
}

/** Wie htmlZuText, behält aber Link-Ziele als «Text [URL]», damit Claude sie zuordnen kann. */
export function htmlZuTextMitLinks(html: string, maxZeichen = 60_000): string {
  return htmlZuText(
    html.replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, inner) => `${inner} [${href}]`),
    maxZeichen,
  );
}
