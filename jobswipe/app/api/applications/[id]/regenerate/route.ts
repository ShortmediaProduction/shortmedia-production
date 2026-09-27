import { after, NextResponse } from "next/server";
import { geschuetzt } from "@/lib/auth";
import { db } from "@/lib/db";
import { bewerbungErstellen } from "@/lib/pipeline";

export const maxDuration = 300;

/** «Neu generieren»: Texte neu schreiben (optional auch neu recherchieren) und Entwurf ersetzen. */
export const POST = geschuetzt(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { neuRecherchieren = false } = (await req.json().catch(() => ({}))) as { neuRecherchieren?: boolean };
  await db().updateApplication(id, { status: "in_arbeit", schritt: "In Warteschlange", fehler: null });
  after(() => bewerbungErstellen(id, { neuRecherchieren }));
  return NextResponse.json({ ok: true });
});
