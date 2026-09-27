import { NextResponse, type NextRequest } from "next/server";
import { authClient } from "@/lib/supabase/server";
import { istErlaubt } from "@/lib/auth";

/** Magic-Link-Rückkehr von Supabase: Code gegen Session tauschen. */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const ziel = req.nextUrl.clone();
  ziel.search = "";
  if (code) {
    const sb = await authClient();
    const { data, error } = await sb.auth.exchangeCodeForSession(code);
    if (!error && istErlaubt(data.user?.email)) {
      ziel.pathname = "/";
      return NextResponse.redirect(ziel);
    }
    await sb.auth.signOut();
  }
  ziel.pathname = "/login";
  ziel.searchParams.set("fehler", "link");
  return NextResponse.redirect(ziel);
}
