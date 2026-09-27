import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // react-pdf und die Google-Clients laufen nur serverseitig und werden nicht gebündelt.
  serverExternalPackages: ["@react-pdf/renderer", "@googleapis/gmail", "google-auth-library"],
  // Kontextdateien (lokaler Fallback) und PDF-Schriften in die Serverless-Funktionen mitnehmen.
  outputFileTracingIncludes: {
    "/api/**/*": ["./assets/fonts/**/*", "./context/**/*"],
  },
};

export default nextConfig;
