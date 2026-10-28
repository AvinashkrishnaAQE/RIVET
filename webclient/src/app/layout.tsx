import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Landing-page typography: Playfair Display (italic) for headlines, Inter for UI text.
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter-ui",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "ReViT — Intelligence, connected", template: "%s · ReViT" },
  description:
    "An AI workspace where agents, sources and creative tools share one neural canvas.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
