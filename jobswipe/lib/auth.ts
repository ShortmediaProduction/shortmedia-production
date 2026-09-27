import { NextResponse } from "next/server";
import { env } from "@/lib/config";
import { authClient } from "@/lib/supabase/server";

export function istErlaubt(email: string | null | undefined): boolean {
  return !!env.allowedEmail && !!email && email.toLowerCase() === env.allowedEmail;
}

/** Zweite Verteidigungslinie in jeder API-Route (der Proxy prüft zusätzlich). */
export async function angemeldet(): Promise<boolean> {
  if (env.demoMode) return true;
  if (!env.supabaseUrl || !env.supabaseAnonKey || !env.allowedEmail) return false;
  const sb = await authClient();
  const { data } = await sb.auth.getUser();
  return istErlaubt(data.user?.email);
}

export function nichtErlaubt() {
  return NextResponse.json({ fehler: "Nicht angemeldet" }, { status: 401 });
}

/** Hilfsfunktion für Route Handler: prüft Login und fängt Fehler als JSON ab. */
export function geschuetzt<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    if (!(await angemeldet())) return nichtErlaubt();
    try {
      return await handler(...args);
    } catch (e) {
      return NextResponse.json({ fehler: e instanceof Error ? e.message : String(e) }, { status: 500 });
    }
  };
}
