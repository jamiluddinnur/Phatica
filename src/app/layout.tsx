import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://phatica.vercel.app"
  ),
  title: "Phatica — AI-Powered Strategic Communication Skills.",
  description:
    "Komunikasi Strategis, Dilatih dengan Kecerdasan Buatan. Latihan komunikasi dengan sparring partner AI: roleplay 29 skenario di 5 pilar, dinilai Evaluation Agent dengan rubrik dan bukti kutipan, lalu naik level lewat memori antar-sesi.",
  icons: { icon: "/logo.webp", apple: "/logo.webp" },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Phatica — AI-Powered Strategic Communication Skills.",
    description:
      "Komunikasi Strategis, Dilatih dengan Kecerdasan Buatan. Latihan komunikasi dengan sparring partner AI: roleplay, evaluasi, dan naik level.",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://phatica.vercel.app",
    siteName: "Phatica",
    locale: "id_ID",
    type: "website",
    images: [{ url: "/logo.webp", width: 512, height: 512, alt: "Logo Phatica" }],
  },
  twitter: {
    card: "summary",
    title: "Phatica — AI-Powered Strategic Communication Skills.",
    description:
      "Komunikasi Strategis, Dilatih dengan Kecerdasan Buatan. Latihan komunikasi dengan sparring partner AI.",
    images: ["/logo.webp"],
  },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="id"><body>{children}</body></html>);
}
