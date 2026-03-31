import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { getLocale, getMessages } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";

import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "600"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Deep Research",
  description: "AI-powered deep research tool",
  applicationName: "Deep Research",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Deep Research",
  },
  manifest: "/manifest.webmanifest",
  icons: [
    {
      url: "/logo.png",
      sizes: "512x512",
      type: "image/png",
    },
    {
      url: "/logo.svg",
      sizes: "any",
      type: "image/svg+xml",
    },
  ],
};

export const viewport: Viewport = {
  themeColor: "#c0c1ff",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  // Enable static rendering with the detected locale
  setRequestLocale(locale);

  return (
    <html lang={locale} className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <Providers messages={messages} locale={locale}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
