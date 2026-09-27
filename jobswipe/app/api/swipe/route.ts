import { after, NextResponse } from "next/server";
import { z } from "zod";
import { geschuetzt } from "@/lib/auth";
import { db } from "@/lib/db";
import { bewerbungErstellen } from "@/lib/pipeline";

export const maxDuration = 300;

const SwipeBody = z.object({
  job_id: z.string(),
  richtung: z.enum(["links", "rechts", "hoch"]),
  grund: z.string().nullish(),
});

export const POST = geschuetzt(async (req: Request) => {
  const body = SwipeBody.parse(await req.json());
  const repo = db();
  const job = await repo.getJob(body.job_id);
  if (!job) return NextResponse.json({ fehler: "Stelle nicht gefunden" }, { status: 404 });

  const swipe = await repo.insertSwipe(job.id, body.richtung, body.grund ?? null);
  let applicationId: string | null = null;
  if (body.richtung === "rechts") {
    const vorhanden = await repo.applicationFuerJob(job.id);
    const app = vorhanden ?? (await repo.createApplication(job.id, { schritt: "In Warteschlange" }));
    applicationId = app.id;
    // Läuft nach der Antwort weiter, die Karte fliegt sofort weg.
    if (!vorhanden) after(() => bewerbungErstellen(app.id));
  }
  return NextResponse.json({ swipe, application_id: applicationId });
});

const GrundBody = z.object({ swipe_id: z.string(), grund: z.string().nullable() });

export const PATCH = geschuetzt(async (req: Request) => {
  const body = GrundBody.parse(await req.json());
  await db().updateSwipeGrund(body.swipe_id, body.grund);
  return NextResponse.json({ ok: true });
});
