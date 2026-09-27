import { env } from "@/lib/config";
import type { Repo } from "./repo";
import { createSupabaseRepo } from "./supabase";
import { createMemoryRepo } from "./memory";

let repo: Repo | null = null;

export function db(): Repo {
  if (!repo) {
    if (env.demoMode) repo = createMemoryRepo();
    else if (env.supabaseUrl && env.supabaseServiceKey) repo = createSupabaseRepo();
    else throw new Error("Supabase ist nicht konfiguriert (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  }
  return repo;
}

export type { Repo } from "./repo";
