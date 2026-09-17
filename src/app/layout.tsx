import type { Metadata, Viewport } from "next";
import {
  Geist_Mono,
  Noto_Sans_Arabic,
  Plus_Jakarta_Sans,
} from "next/font/google";
import { AppProviders } from "@/components/providers/app-providers";
import { APP_NAME } from "@/constants";
import "./globals.css";

/**
 * Latin UI — modern product face for EN copy, labels, and numerals.
 * Pairs cleanly with Noto Sans Arabic in bilingual layouts.
 */
const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  preload: true,
});

/**
 * Arabic UI — primary face for RTL product surfaces.
 * High legibility at UI sizes (13–16px) and headings.
 */
const notoArabic = Noto_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
});

/** Mono — IDs, timers, codes, tabular technical values (defer; not above-the-fold). */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_NAME,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f4f8" },
    { media: "(prefers-color-scheme: dark)", color: "#050910" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${plusJakarta.variable} ${notoArabic.variable} ${geistMono.variable} antialiased`}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
