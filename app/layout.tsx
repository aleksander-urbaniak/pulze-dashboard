import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";

import ThemeProvider from "../components/ThemeProvider";
import AppearanceProvider from "../components/AppearanceProvider";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"]
});

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "PulZe Monitoring",
  description: "Unified monitoring dashboard"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AppearanceProvider>{children}</AppearanceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
