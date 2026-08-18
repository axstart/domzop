import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Domzop — Property Intelligence",
  description:
    "Portfolio manager and property intelligence lab for domain and real estate holdings",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface text-gray-100 antialiased">{children}</body>
    </html>
  );
}
