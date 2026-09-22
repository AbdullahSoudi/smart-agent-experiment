import type { Metadata } from "next";
import { Readex_Pro } from "next/font/google";
import "./globals.css";

const readexPro = Readex_Pro({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-readex",
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
    <html lang="ar" dir="rtl" className={readexPro.variable}>
      <body>{children}</body>
    </html>
  );
}
