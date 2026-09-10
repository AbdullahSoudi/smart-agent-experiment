import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ابدأ التجربة · تجربة الوكيل الذكي",
  description: "بيئة تعلم ذكية قائمة على المحادثة لاستكشاف الفرص الرقمية",
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
