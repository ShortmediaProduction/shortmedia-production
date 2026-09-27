import type { Application, Job, RawJob, Richtung, Settings, Swipe } from "@/lib/types";

export type NewJob = RawJob & { dedupe_key: string; quellen: string[] };
export type JobPatch = Partial<Omit<Job, "id" | "erstellt_am">>;
export type AppPatch = Partial<Omit<Application, "id" | "job_id" | "erstellt_am">>;

export interface SwipeMitJob extends Swipe {
  job: Job;
}

export interface Repo {
  getSettings(): Promise<Settings>;
  updateSettings(patch: Partial<Settings>): Promise<Settings>;

  jobsMitFirmaKey(firmaKey: string): Promise<Job[]>;
  insertJob(job: NewJob): Promise<Job>;
  getJob(id: string): Promise<Job | null>;
  updateJob(id: string, patch: JobPatch): Promise<void>;
  jobsZumBewerten(limit: number): Promise<Job[]>;
  /** Bewertete, noch nicht geswipte Stellen (Filter nach Score/Kategorie macht der Aufrufer). */
  offeneJobs(): Promise<Job[]>;
  gemerkteJobs(): Promise<Job[]>;

  insertSwipe(jobId: string, richtung: Richtung, grund?: string | null): Promise<Swipe>;
  letzterSwipe(): Promise<Swipe | null>;
  deleteSwipe(id: string): Promise<void>;
  updateSwipeGrund(id: string, grund: string | null): Promise<void>;
  letzteSwipes(richtung: Richtung, limit: number): Promise<SwipeMitJob[]>;

  createApplication(jobId: string, patch?: AppPatch): Promise<Application>;
  getApplication(id: string): Promise<Application | null>;
  applicationFuerJob(jobId: string): Promise<Application | null>;
  listApplications(): Promise<(Application & { job: Job })[]>;
  updateApplication(id: string, patch: AppPatch): Promise<void>;
  deleteApplication(id: string): Promise<void>;

  istVerarbeitet(key: string): Promise<boolean>;
  markiereVerarbeitet(key: string): Promise<void>;

  getGoogleToken(): Promise<{ email: string | null; refresh_token: string } | null>;
  saveGoogleToken(email: string | null, refreshToken: string): Promise<void>;

  upload(bucket: "context" | "applications", path: string, data: Buffer, contentType: string): Promise<void>;
  download(bucket: "context" | "applications", path: string): Promise<Buffer | null>;
}
