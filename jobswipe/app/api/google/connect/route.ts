import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { angemeldet, nichtErlaubt } from "@/lib/auth";
import { authUrl } from "@/lib/gmail/client";

export async function GET() {
  if (!(await angemeldet())) return nichtErlaubt();
  const state = randomBytes(24).toString("hex");
  const res = NextResponse.redirect(authUrl(state));
  res.cookies.set("g_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  return res;
}
