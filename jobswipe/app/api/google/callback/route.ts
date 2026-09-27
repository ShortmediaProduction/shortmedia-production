import { NextResponse, type NextRequest } from "next/server";
import { angemeldet, nichtErlaubt } from "@/lib/auth";
import { env } from "@/lib/config";
import { codeEinloesen } from "@/lib/gmail/client";

export async function GET(req: NextRequest) {
  if (!(await angemeldet())) return nichtErlaubt();
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const erwartet = req.cookies.get("g_oauth_state")?.value;
  const ziel = new URL("/einstellungen", env.appUrl);
  if (!code || !state || state !== erwartet) {
    ziel.searchParams.set("gmail", "fehler");
  } else {
    try {
      await codeEinloesen(code);
      ziel.searchParams.set("gmail", "ok");
    } catch (e) {
      ziel.searchParams.set("gmail", "fehler");
      ziel.searchParams.set("info", e instanceof Error ? e.message.slice(0, 200) : "unbekannt");
    }
  }
  const res = NextResponse.redirect(ziel);
  res.cookies.delete("g_oauth_state");
  return res;
}
