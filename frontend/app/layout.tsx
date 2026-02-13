import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/shared/AuthGuard";
import ToastContainer from "@/components/shared/ToastContainer";
import RuntimeConfig from "@/components/shared/RuntimeConfig";

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
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws";

  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased bg-slate-50 text-slate-900 h-screen overflow-hidden selection:bg-sky-100 selection:text-sky-900 font-sans">
        <RuntimeConfig apiUrl={apiUrl} wsUrl={wsUrl} />
        <AuthGuard>
          {children}
        </AuthGuard>
        <ToastContainer />
      </body>
    </html>
  );
}
