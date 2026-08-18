"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { ChartCard, HashLookupScore, MetricPills } from "@/components/charts";
import { formatMoney, plClass } from "@/lib/money";
import type { IntelligenceOutlook, PropertyCard } from "@/lib/portfolio-types";

function outlookTone(outlook: IntelligenceOutlook | null): "ok" | "warn" | "bad" | "info" {
  if (outlook === "bullish") return "ok";
  if (outlook === "bearish") return "bad";
  return "warn";
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

  const avgScore =
    cards.length === 0
      ? null
      : cards.reduce((s, c) => s + (c.intelligence_score ?? 0), 0) /
        cards.filter((c) => c.intelligence_score != null).length;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-neon-gold">
            Property intelligence lab
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Available properties</h1>
          <p className="mt-2 max-w-2xl text-gray-400">
            Browse listings and open charted intelligence — past marks, present snapshot, and a
            Domzop Formula path with related projects that may lift or pressure value.
          </p>
        </div>
        <Link
          href="/portfolio/new?type=real_estate"
          className="rounded-lg bg-neon-cyan/20 px-4 py-2 text-sm text-neon-cyan shadow-neon hover:bg-neon-cyan/30"
        >
          Add listing
        </Link>
      </header>

      <Nav />

      <section className="mb-8 grid gap-4 lg:grid-cols-3">
        <ChartCard
          index={1}
          title="Lab pulse"
          accent="green"
          caption="Hash-lookup style score — one lit cell in the row for the board average."
        >
          <HashLookupScore score={Number.isFinite(avgScore) ? avgScore! : null} label="Avg score" />
        </ChartCard>
        <ChartCard
          index={2}
          title="Board status"
          accent="cyan"
          caption="What you can act on right now."
          className="lg:col-span-2"
        >
          <MetricPills
            items={[
              { label: "LISTINGS", value: String(cards.length), tone: "info" },
              {
                label: "VIEW",
                value: includeOwned ? "incl. owned" : "watching",
                tone: "warn",
              },
              {
                label: "BULLISH",
                value: String(cards.filter((c) => c.outlook === "bullish").length),
                tone: "ok",
              },
              {
                label: "BEARISH",
                value: String(cards.filter((c) => c.outlook === "bearish").length),
                tone: "bad",
              },
            ]}
          />
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => setIncludeOwned(false)}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                !includeOwned
                  ? "bg-neon-cyan/20 text-neon-cyan"
                  : "text-gray-400 hover:bg-surface-border"
              }`}
            >
              Available / watching
            </button>
            <button
              onClick={() => setIncludeOwned(true)}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                includeOwned
                  ? "bg-neon-cyan/20 text-neon-cyan"
                  : "text-gray-400 hover:bg-surface-border"
              }`}
            >
              Include owned
            </button>
          </div>
        </ChartCard>
      </section>

      {loading ? (
        <p className="text-gray-500">Loading listings…</p>
      ) : cards.length === 0 ? (
        <div className="chart-panel px-6 py-12 text-center text-gray-500">
          No available properties yet. Add a watchlist listing to start the intelligence lab.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card, i) => {
            const re = card.asset.real_estate;
            const loc = [re?.city, re?.region].filter(Boolean).join(", ");
            return (
              <Link
                key={card.asset.id}
                href={`/properties/${card.asset.id}`}
                className="chart-panel group transition hover:border-neon-cyan/50 hover:shadow-neon"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-neon-gold">
                      {i + 1}. {re?.property_type ?? "property"}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold group-hover:text-neon-cyan">
                      {card.asset.name}
                    </h2>
                    {loc && <p className="mt-1 text-sm text-gray-400">{loc}</p>}
                  </div>
                  <HashLookupScore
                    score={card.intelligence_score}
                    label="Score"
                    cells={7}
                    compact
                  />
                </div>
                <MetricPills
                  items={[
                    {
                      label: "MARK",
                      value: formatMoney(
                        card.asset.current_value ?? card.asset.acquisition_cost,
                        card.asset.currency,
                      ),
                      tone: "info",
                    },
                    {
                      label: "OUTLOOK",
                      value: card.outlook ?? "—",
                      tone: outlookTone(card.outlook),
                    },
                    {
                      label: "1Y",
                      value:
                        card.predicted_delta_pct == null
                          ? "—"
                          : `${card.predicted_delta_pct > 0 ? "+" : ""}${card.predicted_delta_pct}%`,
                      tone: (card.predicted_delta_pct ?? 0) >= 0 ? "ok" : "bad",
                    },
                  ]}
                />
                <p className={`mt-3 text-xs ${plClass(card.predicted_delta_pct)}`}>
                  Open charts → past · present · future
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
