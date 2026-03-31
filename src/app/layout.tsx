import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Deep Research",
  description: "AI-powered deep research tool",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
