import Link from "next/link";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-widest text-neon-gold">Domzop</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
        Choose your module
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-gray-400">
        Two investing labs under one book — digital domains and physical property intelligence.
      </p>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <Link
          href="/domains"
          className="group rounded-3xl border border-surface-border bg-surface-raised/80 p-8 transition hover:border-neon-cyan hover:shadow-neon"
        >
          <p className="text-xs uppercase tracking-widest text-neon-cyan">Module 01</p>
          <h2 className="mt-3 text-3xl font-bold group-hover:text-neon-cyan">Domains</h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-400">
            Research candidates, score opportunities, manage domain holdings and investor reports.
          </p>
          <span className="mt-6 inline-block text-sm text-neon-cyan">Enter domain lab →</span>
        </Link>

        <Link
          href="/properties"
          className="group rounded-3xl border border-surface-border bg-surface-raised/80 p-8 transition hover:border-neon-green hover:shadow-neon-green"
        >
          <p className="text-xs uppercase tracking-widest text-neon-green">Module 02</p>
          <h2 className="mt-3 text-3xl font-bold group-hover:text-neon-green">Properties</h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-400">
            Pick country and city, browse listings with photos and prices, map the inventory, and
            open Ax Panel intelligence on any real estate.
          </p>
          <span className="mt-6 inline-block text-sm text-neon-green">Enter property lab →</span>
        </Link>
      </div>

      <p className="mt-10 text-center text-xs text-gray-600">
        <Link href="/portfolio" className="hover:text-gray-400">
          Portfolio book
        </Link>
        {" · "}
        <Link href="/bots" className="hover:text-gray-400">
          Bots
        </Link>
      </p>
    </main>
  );
}
