import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JobSwipe",
    short_name: "JobSwipe",
    description: "Stellen swipen, Bewerbungen als Gmail-Entwurf.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F2F2F0",
    theme_color: "#F2F2F0",
    lang: "de-CH",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
