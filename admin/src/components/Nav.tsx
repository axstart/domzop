"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/domains", label: "Domains" },
  { href: "/properties", label: "Properties" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/investors", label: "Investors" },
  { href: "/reports", label: "Reports" },
  { href: "/bots", label: "Bots" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="mb-8 flex flex-wrap gap-1 border-b border-surface-border pb-4">
      {NAV.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-4 py-2 text-sm transition ${
              active
                ? "bg-neon-cyan/20 text-neon-cyan shadow-neon"
                : "text-gray-400 hover:bg-surface-border hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
