import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Phatica — AI-Powered Strategic Communication Skills.",
  description: "Komunikasi Strategis, Dilatih dengan Kecerdasan Buatan. Platform latihan komunikasi berbasis Multi-Agent AI: sparring partner roleplay + Evaluation Agent, 4 pilar, 24 skenario, memori antar-sesi, dan Personal Branding.",
  icons: { icon: "/logo.webp", apple: "/logo.webp" },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="id"><body>{children}</body></html>);
}
