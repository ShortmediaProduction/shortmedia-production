import { NextResponse } from "next/server";
import { geschuetzt } from "@/lib/auth";
import { db } from "@/lib/db";
import { filtereDeck } from "@/lib/deck";

export const dynamic = "force-dynamic";

export const GET = geschuetzt(async () => {
  const repo = db();
  const [settings, offen] = await Promise.all([repo.getSettings(), repo.offeneJobs()]);
  const deck = filtereDeck(offen, settings);
  return NextResponse.json({
    jobs: deck.slice(0, 30),
    anzahl: deck.length,
    ausgeblendet: offen.length - deck.length,
    letzter_lauf: settings.letzter_lauf,
  });
});
