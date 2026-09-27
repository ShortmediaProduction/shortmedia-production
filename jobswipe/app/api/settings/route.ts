import { NextResponse } from "next/server";
import { z } from "zod";
import { geschuetzt } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const GET = geschuetzt(async () => NextResponse.json(await db().getSettings()));

const SettingsBody = z.object({
  regionen: z.array(z.string().trim().min(1)).max(40),
  mindest_score: z.number().int().min(0).max(100),
  kategorien: z.array(z.string()),
  web_quellen: z
    .array(z.object({ name: z.string().trim().min(1), url: z.url(), typ: z.enum(["seite", "rss"]) }))
    .max(50),
});

export const PUT = geschuetzt(async (req: Request) => {
  const body = SettingsBody.parse(await req.json());
  return NextResponse.json(await db().updateSettings(body));
});
