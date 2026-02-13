import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import AuthGuard from "@/components/shared/AuthGuard";
import ToastContainer from "@/components/shared/ToastContainer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "ECG Live Platform",
  description: "Real-time ECG monitoring system",
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased bg-slate-50 text-slate-900 h-screen overflow-hidden selection:bg-sky-100 selection:text-sky-900 font-sans">
        <Script src="/env-config.js" strategy="beforeInteractive" />
        <AuthGuard>
          {children}
        </AuthGuard>
        <ToastContainer />
      </body>
    </html>
  );
}
