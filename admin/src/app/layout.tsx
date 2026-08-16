import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Domain Investing Research Lab",
  description: "Discovery, research, scoring, and investor reports for domain opportunities",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface text-gray-100 antialiased">{children}</body>
    </html>
  );
}
