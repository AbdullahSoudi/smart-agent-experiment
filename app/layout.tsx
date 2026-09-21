import type { Metadata } from "next";
import { Alexandria } from "next/font/google";
import "./globals.css";

const alexandria = Alexandria({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-alexandria",
  display: "swap",
});

export const metadata: Metadata = {
  title: "المرشد الريادي الذكي · تجربة ريادة الأعمال الرقمية",
  description: "بيئة تعلم ذكية قائمة على المحادثة لبناء وتطوير المشاريع الرقمية عبر 5 مراحل تفاعلية",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={alexandria.variable}>
      <body>{children}</body>
    </html>
  );
}
