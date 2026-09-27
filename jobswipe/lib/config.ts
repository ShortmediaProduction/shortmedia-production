/** Zentrale Stelle für Umgebungsvariablen. Keine Keys im Code. */
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  allowedEmail: (process.env.ALLOWED_EMAIL ?? "").trim().toLowerCase(),
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? "",
  scoringModel: process.env.SCORING_MODEL ?? "claude-sonnet-5",
  writingModel: process.env.WRITING_MODEL ?? "claude-opus-5-5",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  appUrl: (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  cronSecret: process.env.CRON_SECRET ?? "",
  gmailAlertLabel: process.env.GMAIL_ALERT_LABEL ?? "JobSwipe/Alerts",
  userAgent:
    process.env.CRAWLER_USER_AGENT ??
    "JobSwipe/1.0 (private Stellensuche einer Einzelperson; respektiert robots.txt)",
  /** Nur lokal: ohne Supabase mit Beispieldaten im Speicher arbeiten. */
  demoMode: process.env.DEMO_MODE === "1" && process.env.NODE_ENV !== "production",
};

/** Absenderdaten für Schreiben und Mail. Bewusst aus der Umgebung, nicht aus dem Code (öffentliches Repo). */
export const absender = {
  name: process.env.ABSENDER_NAME ?? "Julian Lang",
  ort: process.env.ABSENDER_ORT ?? "Sissach",
  telefon: process.env.ABSENDER_TELEFON ?? "",
  email: process.env.ABSENDER_EMAIL ?? "",
  web: process.env.ABSENDER_WEB ?? "www.julianlang.ch",
  signatur: (process.env.MAIL_SIGNATUR ?? "Julian Lang - Video-/ Filmproduktion\\nhttps://julianlang.ch/").replace(/\\n/g, "\n"),
};

export const SCORE_BATCH_LIMIT = Number(process.env.SCORE_BATCH_LIMIT ?? 40);
