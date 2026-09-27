import { NextResponse } from "next/server";
import { geschuetzt } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const GET = geschuetzt(async () => {
  const repo = db();
  const [bewerbungen, gemerkt] = await Promise.all([repo.listApplications(), repo.gemerkteJobs()]);
  return NextResponse.json({ bewerbungen, gemerkt });
});
