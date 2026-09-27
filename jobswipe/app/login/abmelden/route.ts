import { NextResponse } from "next/server";
import { env } from "@/lib/config";
import { authClient } from "@/lib/supabase/server";

export async function POST() {
  if (env.supabaseUrl && env.supabaseAnonKey) await (await authClient()).auth.signOut();
  return NextResponse.redirect(new URL("/login", env.appUrl), { status: 303 });
}
