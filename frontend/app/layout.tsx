import type { Metadata } from "next";
import { Space_Grotesk, Work_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const sans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const mono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const favicon =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%234f5bd5'/%3E%3Ctext x='16' y='22' font-size='14' font-weight='700' font-family='Arial' fill='white' text-anchor='middle'%3ESN%3C/text%3E%3C/svg%3E";

export const metadata: Metadata = {
  title: {
    default: "Satria Nusa — Fullstack / Backend Engineer",
    template: "%s — Satria Nusa",
  },
  description:
    "Personal portfolio of Satria Aluh Perwira Nusa — a fullstack/backend engineer who builds software end to end.",
  icons: { icon: favicon },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
