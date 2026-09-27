import { after, NextResponse } from "next/server";
import { geschuetzt } from "@/lib/auth";
import { ingest } from "@/lib/ingest";

export const maxDuration = 300;

/** Manuell «Jetzt nach neuen Stellen suchen» aus den Einstellungen. */
export const POST = geschuetzt(async () => {
  after(() => ingest({ quellenAbrufen: true, budgetMs: 270_000 }));
  return NextResponse.json({ ok: true, gestartet: new Date().toISOString() });
});
