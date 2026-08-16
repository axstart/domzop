import Link from "next/link";

const NAV = [
  { href: "/", label: "Candidates" },
  { href: "/investors", label: "Investors" },
  { href: "/reports", label: "Reports" },
  { href: "/bots", label: "Bots" },
];

export function Nav() {
  return (
    <nav className="mb-8 flex flex-wrap gap-1 border-b border-surface-border pb-4">
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-lg px-4 py-2 text-sm text-gray-400 transition hover:bg-surface-border hover:text-white"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
