import { NextResponse } from "next/server";
import { geschuetzt } from "@/lib/auth";
import { db } from "@/lib/db";

export const GET = geschuetzt(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const repo = db();
  const app = await repo.getApplication(id);
  if (!app?.pdf_pfad) return NextResponse.json({ fehler: "Noch kein PDF" }, { status: 404 });
  const pdf = await repo.download("applications", app.pdf_pfad);
  if (!pdf) return NextResponse.json({ fehler: "PDF nicht gefunden" }, { status: 404 });
  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": "inline", "Cache-Control": "private, no-store" },
  });
});
