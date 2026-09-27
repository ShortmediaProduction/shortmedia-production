import { NextResponse } from "next/server";
import { geschuetzt } from "@/lib/auth";
import { db } from "@/lib/db";
import { entwurfLoeschen } from "@/lib/gmail/client";

/** Macht den letzten Swipe rückgängig. Bei einem Rechts-Swipe werden Bewerbung und Gmail-Entwurf entfernt. */
export const POST = geschuetzt(async () => {
  const repo = db();
  const swipe = await repo.letzterSwipe();
  if (!swipe) return NextResponse.json({ job: null });
  const job = await repo.getJob(swipe.job_id);

  if (swipe.richtung === "rechts") {
    const app = await repo.applicationFuerJob(swipe.job_id);
    if (app && (app.status === "versendet" || app.status === "gespraech" || app.status === "absage")) {
      return NextResponse.json({ fehler: "Diese Bewerbung ist schon versendet und kann nicht rückgängig gemacht werden." }, { status: 409 });
    }
    if (app) {
      if (app.gmail_draft_id) await entwurfLoeschen(app.gmail_draft_id).catch(() => undefined);
      await repo.deleteApplication(app.id);
    }
  }
  await repo.deleteSwipe(swipe.id);
  return NextResponse.json({ job, richtung: swipe.richtung });
});
