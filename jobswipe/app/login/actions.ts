"use server";
import { redirect } from "next/navigation";
import { env } from "@/lib/config";
import { istErlaubt } from "@/lib/auth";
import { authClient } from "@/lib/supabase/server";

export async function sendeLink(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  // Für fremde Adressen wird nichts verschickt, die Antwort sieht aber gleich aus.
  if (istErlaubt(email)) {
    const sb = await authClient();
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${env.appUrl}/auth/callback` } });
    if (error) redirect(`/login?fehler=senden`);
  }
  redirect("/login?gesendet=1");
}
