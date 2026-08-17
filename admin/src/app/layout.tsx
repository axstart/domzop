import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Domzop — Portfolio Manager",
  description:
    "Portfolio manager for domain and real estate holdings, with a research lab for domain discovery",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface text-gray-100 antialiased">{children}</body>
    </html>
  );
}
