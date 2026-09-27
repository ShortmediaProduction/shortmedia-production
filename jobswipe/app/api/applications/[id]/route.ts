import { after, NextResponse } from "next/server";
import { z } from "zod";
import { geschuetzt } from "@/lib/auth";
import { db } from "@/lib/db";
import { nachBearbeitungAktualisieren } from "@/lib/pipeline";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = geschuetzt(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const repo = db();
  const app = await repo.getApplication(id);
  if (!app) return NextResponse.json({ fehler: "Nicht gefunden" }, { status: 404 });
  return NextResponse.json({ ...app, job: await repo.getJob(app.job_id) });
});

const StatusBody = z.object({ status: z.enum(["in_arbeit", "entwurf", "versendet", "absage", "gespraech"]) });

/** Status manuell setzen (versendet, Absage, Gespräch …). */
export const PATCH = geschuetzt(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const { status } = StatusBody.parse(await req.json());
  await db().updateApplication(id, { status });
  return NextResponse.json({ ok: true });
});

const TextBody = z.object({
  anrede: z.string().min(1),
  betreff: z.string().min(1),
  anschreiben_text: z.string().min(1),
  mail_text: z.string().min(1),
});

/** «Entwurf aktualisieren»: bearbeitete Texte speichern, PDF neu rendern, Gmail-Entwurf ersetzen. */
export const PUT = geschuetzt(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const texte = TextBody.parse(await req.json());
  const repo = db();
  await repo.updateApplication(id, { ...texte, schritt: "Entwurf aktualisieren" });
  after(async () => {
    try {
      await nachBearbeitungAktualisieren(id, texte);
    } catch (e) {
      await repo.updateApplication(id, { status: "fehler", schritt: null, fehler: e instanceof Error ? e.message : String(e) });
    }
  });
  return NextResponse.json({ ok: true });
});
