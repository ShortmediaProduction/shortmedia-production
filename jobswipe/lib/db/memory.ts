import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Application, Job, Settings, Swipe } from "@/lib/types";
import { KATEGORIEN } from "@/lib/types";
import type { Repo } from "./repo";
import { demoJobs } from "./demo-data";

/** In-Memory-Speicher für den lokalen Demo-Modus (DEMO_MODE=1). Überlebt Hot Reloads, nicht Neustarts. */
interface State {
  settings: Settings;
  jobs: Job[];
  swipes: Swipe[];
  applications: Application[];
  processed: Set<string>;
  token: { email: string | null; refresh_token: string } | null;
  files: Map<string, Buffer>;
}

const g = globalThis as unknown as { __jobswipeDemo?: State };

function state(): State {
  if (!g.__jobswipeDemo) {
    g.__jobswipeDemo = {
      settings: {
        regionen: ["Basel", "Baselland", "Aargau", "Solothurn", "Zürich", "Bern", "Luzern"],
        mindest_score: 40,
        kategorien: [...KATEGORIEN],
        web_quellen: [],
        letzter_lauf: null,
        lauf_log: null,
      },
      jobs: demoJobs(),
      swipes: [],
      applications: [],
      processed: new Set(),
      token: null,
      files: new Map(),
    };
  }
  return g.__jobswipeDemo;
}

const now = () => new Date().toISOString();

export function createMemoryRepo(): Repo {
  return {
    async getSettings() {
      return state().settings;
    },
    async updateSettings(patch) {
      Object.assign(state().settings, patch);
      return state().settings;
    },
    async jobsMitFirmaKey(firmaKey) {
      return state().jobs.filter((j) => j.dedupe_key.startsWith(`${firmaKey}|`));
    },
    async insertJob(job) {
      const j: Job = {
        bewerbungsweg: null,
        portal_url: null,
        firma_website: null,
        score: null,
        kategorie: null,
        gruende: [],
        red_flags: [],
        scoring_status: "offen",
        scoring_fehler: null,
        ...job,
        id: randomUUID(),
        erstellt_am: now(),
      };
      state().jobs.push(j);
      return j;
    },
    async getJob(id) {
      return state().jobs.find((j) => j.id === id) ?? null;
    },
    async updateJob(id, patch) {
      const j = state().jobs.find((x) => x.id === id);
      if (j) Object.assign(j, patch);
    },
    async jobsZumBewerten(limit) {
      return state().jobs.filter((j) => j.scoring_status === "offen").slice(0, limit);
    },
    async offeneJobs() {
      const swiped = new Set(state().swipes.map((s) => s.job_id));
      return state()
        .jobs.filter((j) => j.scoring_status === "fertig" && !swiped.has(j.id))
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    },
    async gemerkteJobs() {
      const letzte = new Map<string, Swipe>();
      for (const s of state().swipes) letzte.set(s.job_id, s);
      return [...letzte.values()]
        .filter((s) => s.richtung === "hoch")
        .map((s) => state().jobs.find((j) => j.id === s.job_id))
        .filter((j): j is Job => !!j);
    },
    async insertSwipe(jobId, richtung, grund = null) {
      const s: Swipe = { id: randomUUID(), job_id: jobId, richtung, grund, zeitpunkt: now() };
      state().swipes.push(s);
      return s;
    },
    async letzterSwipe() {
      const s = state().swipes;
      return s[s.length - 1] ?? null;
    },
    async deleteSwipe(id) {
      state().swipes = state().swipes.filter((s) => s.id !== id);
    },
    async updateSwipeGrund(id, grund) {
      const s = state().swipes.find((x) => x.id === id);
      if (s) s.grund = grund;
    },
    async letzteSwipes(richtung, limit) {
      return state()
        .swipes.filter((s) => s.richtung === richtung)
        .slice(-limit)
        .reverse()
        .map((s) => ({ ...s, job: state().jobs.find((j) => j.id === s.job_id)! }))
        .filter((s) => s.job);
    },
    async createApplication(jobId, patch = {}) {
      const a: Application = {
        id: randomUUID(),
        job_id: jobId,
        status: "in_arbeit",
        schritt: null,
        fehler: null,
        empfaenger: null,
        betreff: null,
        anrede: null,
        anschreiben_text: null,
        mail_text: null,
        recherche: null,
        pruefung: null,
        pdf_pfad: null,
        gmail_draft_id: null,
        ist_portal: false,
        erstellt_am: now(),
        aktualisiert_am: now(),
        ...patch,
      };
      state().applications.push(a);
      return a;
    },
    async getApplication(id) {
      return state().applications.find((a) => a.id === id) ?? null;
    },
    async applicationFuerJob(jobId) {
      return state().applications.find((a) => a.job_id === jobId) ?? null;
    },
    async listApplications() {
      return [...state().applications]
        .reverse()
        .map((a) => ({ ...a, job: state().jobs.find((j) => j.id === a.job_id)! }))
        .filter((a) => a.job);
    },
    async updateApplication(id, patch) {
      const a = state().applications.find((x) => x.id === id);
      if (a) Object.assign(a, patch, { aktualisiert_am: now() });
    },
    async deleteApplication(id) {
      state().applications = state().applications.filter((a) => a.id !== id);
    },
    async istVerarbeitet(key) {
      return state().processed.has(key);
    },
    async markiereVerarbeitet(key) {
      state().processed.add(key);
    },
    async getGoogleToken() {
      return state().token;
    },
    async saveGoogleToken(email, refreshToken) {
      state().token = { email, refresh_token: refreshToken };
    },
    async upload(bucket, p, data) {
      state().files.set(`${bucket}/${p}`, data);
    },
    async download(bucket, p) {
      const mem = state().files.get(`${bucket}/${p}`);
      if (mem) return mem;
      // Im Demo-Modus liegen die Kontextdateien im lokalen Ordner context/.
      if (bucket === "context") {
        try {
          return await fs.readFile(path.join(process.cwd(), "context", p));
        } catch {
          return null;
        }
      }
      return null;
    },
  };
}
