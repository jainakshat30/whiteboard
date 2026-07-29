import type { Metadata } from "next";
import { primaryFont } from "@/config/font";
import "./globals.css";

export const metadata: Metadata = {
  title: "Whiteboard — Collaborative Hand-drawn Canvas",
  description: "Real-time collaborative whiteboard powered by Next.js and Yjs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${primaryFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors">{children}</body>
    </html>
  );
}

