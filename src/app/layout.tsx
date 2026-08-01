import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My ETF Shop — Rules-driven RSI ETF accumulation",
  description:
    "A mechanical rules engine for a curated basket of liquid Indian ETFs. Paper-first by default; you graduate to live only when you decide you're ready.",
  keywords: ["ETF", "RSI", "rotation", "paper trading", "Indian markets", "rules-based"],
  authors: [{ name: "My ETF Shop" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "My ETF Shop",
    description: "Rules-driven RSI ETF accumulation, paper-first by default.",
    siteName: "My ETF Shop",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "My ETF Shop",
    description: "Rules-driven RSI ETF accumulation, paper-first by default.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
