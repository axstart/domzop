"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MODULES = [
  { href: "/domains", label: "Domains", blurb: "Research & holdings" },
  { href: "/properties", label: "Properties", blurb: "Listings & Ax intelligence" },
];

export function ModuleSwitcher() {
  const pathname = usePathname();
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2">
      {MODULES.map((m) => {
        const active = pathname === m.href || pathname.startsWith(`${m.href}/`);
        return (
          <Link
            key={m.href}
            href={m.href}
            className={`rounded-2xl border px-5 py-4 transition ${
              active
                ? "border-neon-cyan bg-neon-cyan/10 shadow-neon"
                : "border-surface-border bg-surface-raised/60 hover:border-neon-cyan/40"
            }`}
          >
            <p className="text-xs uppercase tracking-widest text-neon-gold">{m.label}</p>
            <p className="mt-1 text-lg font-semibold">{m.label} module</p>
            <p className="mt-1 text-sm text-gray-500">{m.blurb}</p>
          </Link>
        );
      })}
    </div>
  );
}
