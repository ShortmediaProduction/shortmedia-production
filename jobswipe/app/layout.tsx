import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const poppins = localFont({
  src: [
    { path: "./fonts/Poppins-400.woff2", weight: "400" },
    { path: "./fonts/Poppins-500.woff2", weight: "500" },
    { path: "./fonts/Poppins-600.woff2", weight: "600" },
    { path: "./fonts/Poppins-700.woff2", weight: "700" },
  ],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "JobSwipe",
  description: "Stellen swipen, Bewerbungen als Gmail-Entwurf.",
  applicationName: "JobSwipe",
  appleWebApp: { capable: true, title: "JobSwipe", statusBarStyle: "default" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#F2F2F0",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de-CH" className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}
