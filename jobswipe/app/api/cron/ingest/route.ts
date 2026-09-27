import { NextResponse } from "next/server";
import { env } from "@/lib/config";
import { ingest } from "@/lib/ingest";
import { zuerichStunde } from "@/lib/zeit";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!env.cronSecret || req.headers.get("authorization") !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ fehler: "unauthorized" }, { status: 401 });
  }
  // Um 06:00 Zürich alles abrufen. Der zweite Lauf (07:00 bzw. 05:00) bewertet nur Liegengebliebenes.
  const log = await ingest({ quellenAbrufen: zuerichStunde() === 6, budgetMs: 280_000 });
  return NextResponse.json(log);
}
