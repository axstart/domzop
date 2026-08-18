"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { formatMoney, plClass } from "@/lib/money";
import type { IntelligenceOutlook, PropertyCard } from "@/lib/portfolio-types";

function outlookClass(outlook: IntelligenceOutlook | null): string {
  if (outlook === "bullish") return "text-emerald-400";
  if (outlook === "bearish") return "text-rose-400";
  return "text-amber-300";
}

export default function PropertiesPage() {
  const [cards, setCards] = useState<PropertyCard[]>([]);
  const [includeOwned, setIncludeOwned] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = includeOwned ? "?include_owned=1" : "";
    const res = await fetch(`/api/properties${qs}`);
    const data = await res.json();
    setCards(data.properties ?? []);
    setLoading(false);
  }, [includeOwned]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-accent-muted">
            Property intelligence lab
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Available properties</h1>
          <p className="mt-2 max-w-2xl text-gray-400">
            Browse listings on the watchlist and open intelligence: past marks, present snapshot,
            and a Domzop Formula path for the next 1 / 3 / 5 years — including nearby projects
            that may lift or pressure value.
          </p>
        </div>
        <Link
          href="/portfolio/new?type=real_estate"
          className="rounded-lg bg-accent px-4 py-2 text-sm hover:bg-accent/80"
        >
          Add listing
        </Link>
      </header>

      <Nav />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          onClick={() => setIncludeOwned(false)}
          className={`rounded-lg px-3 py-1.5 text-sm ${
            !includeOwned ? "bg-accent text-white" : "text-gray-400 hover:bg-surface-border"
          }`}
        >
          Available / watching
        </button>
        <button
          onClick={() => setIncludeOwned(true)}
          className={`rounded-lg px-3 py-1.5 text-sm ${
            includeOwned ? "bg-accent text-white" : "text-gray-400 hover:bg-surface-border"
          }`}
        >
          Include owned
        </button>
        <p className="text-xs text-gray-500">
          Watching = pipeline. Owned holdings also have intelligence from Portfolio.
        </p>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading listings…</p>
      ) : cards.length === 0 ? (
        <div className="rounded-xl border border-surface-border bg-surface-raised px-6 py-12 text-center text-gray-500">
          No available properties yet. Add a watchlist listing to start the intelligence lab.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const re = card.asset.real_estate;
            const loc = [re?.city, re?.region].filter(Boolean).join(", ");
            return (
              <Link
                key={card.asset.id}
                href={`/properties/${card.asset.id}`}
                className="group rounded-xl border border-surface-border bg-surface-raised p-5 transition hover:border-accent/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      {re?.property_type ?? "property"} · {card.asset.status}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold group-hover:text-accent-muted">
                      {card.asset.name}
                    </h2>
                    {loc && <p className="mt-1 text-sm text-gray-400">{loc}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-accent-muted">
                      {card.intelligence_score != null ? Math.round(card.intelligence_score) : "—"}
                    </p>
                    <p className="text-[10px] uppercase text-gray-500">Intelligence</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-gray-300">
                    {formatMoney(card.asset.current_value ?? card.asset.acquisition_cost, card.asset.currency)}
                  </span>
                  <span className={`capitalize ${outlookClass(card.outlook)}`}>
                    {card.outlook ?? "unscored"}
                  </span>
                </div>
                <p className={`mt-1 text-xs ${plClass(card.predicted_delta_pct)}`}>
                  1y path{" "}
                  {card.predicted_delta_pct == null
                    ? "—"
                    : `${card.predicted_delta_pct > 0 ? "+" : ""}${card.predicted_delta_pct}%`}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
