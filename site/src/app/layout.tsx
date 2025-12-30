import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// 1. Import Analytics
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "H-1B Wage Map 2027 | Weighted Selection Tool",
  description: "Check your H-1B lottery odds under the new FY2027 Weighted Selection Rule. Interactive map of DOL wage levels and selection probability.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        {/* 2. Add the component here */}
        <Analytics />
      </body>
    </html>
  );
}