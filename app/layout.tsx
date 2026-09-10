import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Agent Experiment",
  description: "Smart Agent Experiment Web Application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
