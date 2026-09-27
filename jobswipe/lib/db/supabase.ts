import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/config";
import type { Application, Job, Settings, Swipe } from "@/lib/types";
import type { Repo } from "./repo";

function fail(error: { message: string } | null, what: string): void {
  if (error) throw new Error(`Supabase (${what}): ${error.message}`);
}

export function createSupabaseRepo(): Repo {
  const sb: SupabaseClient = createClient(env.supabaseUrl, env.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  async function swipedIds(): Promise<Set<string>> {
    const { data, error } = await sb.from("swipes").select("job_id");
    fail(error, "swipes lesen");
    return new Set((data ?? []).map((r) => r.job_id as string));
  }

  return {
    async getSettings() {
      const { data, error } = await sb.from("settings").select("*").eq("id", 1).maybeSingle();
      fail(error, "settings lesen");
      if (!data) {
        const ins = await sb.from("settings").insert({ id: 1 }).select("*").single();
        fail(ins.error, "settings anlegen");
        return ins.data as Settings;
      }
      return data as Settings;
    },
    async updateSettings(patch) {
      const { data, error } = await sb.from("settings").update(patch).eq("id", 1).select("*").single();
      fail(error, "settings speichern");
      return data as Settings;
    },

    async jobsMitFirmaKey(firmaKey) {
      const { data, error } = await sb.from("jobs").select("*").like("dedupe_key", `${firmaKey}|%`);
      fail(error, "jobs suchen");
      return (data ?? []) as Job[];
    },
    async insertJob(job) {
      const { data, error } = await sb.from("jobs").insert(job).select("*").single();
      fail(error, "job speichern");
      return data as Job;
    },
    async getJob(id) {
      const { data, error } = await sb.from("jobs").select("*").eq("id", id).maybeSingle();
      fail(error, "job lesen");
      return (data as Job) ?? null;
    },
    async updateJob(id, patch) {
      const { error } = await sb.from("jobs").update(patch).eq("id", id);
      fail(error, "job aktualisieren");
    },
    async jobsZumBewerten(limit) {
      const { data, error } = await sb
        .from("jobs")
        .select("*")
        .eq("scoring_status", "offen")
        .order("erstellt_am", { ascending: true })
        .limit(limit);
      fail(error, "offene jobs lesen");
      return (data ?? []) as Job[];
    },
    async offeneJobs() {
      const [{ data, error }, swiped] = await Promise.all([
        sb.from("jobs").select("*").eq("scoring_status", "fertig").order("score", { ascending: false }).limit(500),
        swipedIds(),
      ]);
      fail(error, "deck lesen");
      return ((data ?? []) as Job[]).filter((j) => !swiped.has(j.id));
    },
    async gemerkteJobs() {
      const { data, error } = await sb.from("swipes").select("job_id, richtung, zeitpunkt, jobs(*)").order("zeitpunkt");
      fail(error, "gemerkte lesen");
      const letzte = new Map<string, { richtung: string; job: Job }>();
      for (const r of (data ?? []) as unknown as { job_id: string; richtung: string; jobs: Job }[]) {
        letzte.set(r.job_id, { richtung: r.richtung, job: r.jobs });
      }
      return [...letzte.values()].filter((v) => v.richtung === "hoch" && v.job).map((v) => v.job);
    },

    async insertSwipe(jobId, richtung, grund = null) {
      const { data, error } = await sb.from("swipes").insert({ job_id: jobId, richtung, grund }).select("*").single();
      fail(error, "swipe speichern");
      return data as Swipe;
    },
    async letzterSwipe() {
      const { data, error } = await sb.from("swipes").select("*").order("zeitpunkt", { ascending: false }).limit(1);
      fail(error, "letzter swipe");
      return ((data ?? [])[0] as Swipe) ?? null;
    },
    async deleteSwipe(id) {
      const { error } = await sb.from("swipes").delete().eq("id", id);
      fail(error, "swipe löschen");
    },
    async updateSwipeGrund(id, grund) {
      const { error } = await sb.from("swipes").update({ grund }).eq("id", id);
      fail(error, "grund speichern");
    },
    async letzteSwipes(richtung, limit) {
      const { data, error } = await sb
        .from("swipes")
        .select("*, job:jobs(*)")
        .eq("richtung", richtung)
        .order("zeitpunkt", { ascending: false })
        .limit(limit);
      fail(error, "swipe-beispiele");
      return (data ?? []).filter((r) => r.job) as never;
    },

    async createApplication(jobId, patch = {}) {
      const { data, error } = await sb.from("applications").insert({ job_id: jobId, ...patch }).select("*").single();
      fail(error, "bewerbung anlegen");
      return data as Application;
    },
    async getApplication(id) {
      const { data, error } = await sb.from("applications").select("*").eq("id", id).maybeSingle();
      fail(error, "bewerbung lesen");
      return (data as Application) ?? null;
    },
    async applicationFuerJob(jobId) {
      const { data, error } = await sb.from("applications").select("*").eq("job_id", jobId).maybeSingle();
      fail(error, "bewerbung lesen");
      return (data as Application) ?? null;
    },
    async listApplications() {
      const { data, error } = await sb
        .from("applications")
        .select("*, job:jobs(*)")
        .order("erstellt_am", { ascending: false });
      fail(error, "bewerbungen lesen");
      return (data ?? []) as never;
    },
    async updateApplication(id, patch) {
      const { error } = await sb
        .from("applications")
        .update({ ...patch, aktualisiert_am: new Date().toISOString() })
        .eq("id", id);
      fail(error, "bewerbung aktualisieren");
    },
    async deleteApplication(id) {
      const { error } = await sb.from("applications").delete().eq("id", id);
      fail(error, "bewerbung löschen");
    },

    async istVerarbeitet(key) {
      const { data, error } = await sb.from("processed_items").select("key").eq("key", key).maybeSingle();
      fail(error, "processed lesen");
      return !!data;
    },
    async markiereVerarbeitet(key) {
      const { error } = await sb.from("processed_items").upsert({ key });
      fail(error, "processed speichern");
    },

    async getGoogleToken() {
      const { data, error } = await sb.from("google_tokens").select("email, refresh_token").eq("id", 1).maybeSingle();
      fail(error, "google token lesen");
      return data ?? null;
    },
    async saveGoogleToken(email, refreshToken) {
      const { error } = await sb
        .from("google_tokens")
        .upsert({ id: 1, email, refresh_token: refreshToken, aktualisiert_am: new Date().toISOString() });
      fail(error, "google token speichern");
    },

    async upload(bucket, path, data, contentType) {
      const { error } = await sb.storage.from(bucket).upload(path, data, { contentType, upsert: true });
      fail(error, `upload ${bucket}/${path}`);
    },
    async download(bucket, path) {
      const { data, error } = await sb.storage.from(bucket).download(path);
      if (error || !data) return null;
      return Buffer.from(await data.arrayBuffer());
    },
  };
}
