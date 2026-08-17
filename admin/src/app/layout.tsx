import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Domain Investing Research Lab",
  description:
    "Domain investing research lab — monitor project maturity, keyword research, availability, and investor reports",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface text-gray-100 antialiased">{children}</body>
    </html>
  );
}
