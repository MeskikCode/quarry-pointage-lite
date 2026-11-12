import type { Metadata, Viewport } from "next";
import { FIELD_INK, asset } from "@/lib/env";
import { I18nProvider } from "@/lib/i18n/provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pointage Carrière — MeskikCode",
  description:
    "Offline-first attendance for quarry supervisors: one tap per worker, monthly Excel export, five languages. Built in Marrakech by MeskikCode.",
  applicationName: "Pointage Carrière",
  authors: [{ name: "MeskikCode", url: "https://meskikcode.com" }],
  icons: {
    icon: [
      { url: asset("/icons/icon-192.png"), sizes: "192x192", type: "image/png" },
      { url: asset("/icons/icon-512.png"), sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: asset("/icons/apple-touch-icon.png"), sizes: "180x180" }],
  },
  appleWebApp: { capable: true, title: "Pointage", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: FIELD_INK,
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Prerendered in French on the dark field canvas; the saved or detected
  // language is applied on the device (see I18nProvider).
  return (
    <html lang="fr" dir="ltr" data-theme="dark" suppressHydrationWarning>
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
