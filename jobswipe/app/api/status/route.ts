import { NextResponse } from "next/server";
import { geschuetzt } from "@/lib/auth";
import { absender, env } from "@/lib/config";
import { kontextStatus, KONTEXT } from "@/lib/context";
import { gmailVerbunden } from "@/lib/gmail/client";

export const dynamic = "force-dynamic";

export const GET = geschuetzt(async () => {
  const [kontext, gmail] = await Promise.all([kontextStatus(), gmailVerbunden().catch(() => false as const)]);
  return NextResponse.json({
    demo: env.demoMode,
    anthropic: !!env.anthropicKey,
    google: !!env.googleClientId && !!env.googleClientSecret,
    gmail,
    kontext: Object.fromEntries(Object.entries(kontext).map(([k, v]) => [KONTEXT[k as keyof typeof KONTEXT], v])),
    absender: { name: absender.name, telefon: !!absender.telefon, email: !!absender.email },
    alertLabel: env.gmailAlertLabel,
    modelle: { scoring: env.scoringModel, schreiben: env.writingModel },
  });
});
