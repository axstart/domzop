"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Nav } from "@/components/Nav";
import {
  ChartCard,
  CompositionDonut,
  HalvingBars,
  IntelligenceWorkflow,
  MetricPills,
} from "@/components/charts";
import {
  allocationPercents,
  formatMoney,
  formatSignedMoney,
  plClass,
  unrealizedPl,
} from "@/lib/money";
import type { AssetStatus, AssetType, PortfolioAsset, PortfolioSummary } from "@/lib/portfolio-types";

const TYPE_FILTERS: { key: "all" | AssetType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "domain", label: "Domains" },
  { key: "real_estate", label: "Real Estate" },
];

const STATUS_FILTERS: { key: "all" | AssetStatus; label: string }[] = [
  { key: "all", label: "Any status" },
  { key: "owned", label: "Owned" },
  { key: "watchlist", label: "Watchlist" },
  { key: "listed", label: "Listed" },
  { key: "sold", label: "Sold" },
  { key: "discarded", label: "Discarded" },
];

const emptySummary: PortfolioSummary = {
  total_cost: 0,
  total_value: 0,
  unrealized_pl: 0,
  domain_count: 0,
  real_estate_count: 0,
  domain_value: 0,
  real_estate_value: 0,
  owned_count: 0,
  listed_count: 0,
  watchlist_count: 0,
  sold_count: 0,
};

export default function PortfolioPage() {
  const [assets, setAssets] = useState<PortfolioAsset[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary>(emptySummary);
  const [typeFilter, setTypeFilter] = useState<"all" | AssetType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | AssetStatus>("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter !== "all") params.set("asset_type", typeFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    const qs = params.toString();
    const res = await fetch(`/api/portfolio${qs ? `?${qs}` : ""}`);
    const data = await res.json();
    setAssets(data.assets ?? []);
    setSummary(data.summary ?? emptySummary);
    setLoading(false);
  }, [typeFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const alloc = useMemo(
    () => allocationPercents(summary.domain_value, summary.real_estate_value),
    [summary.domain_value, summary.real_estate_value],
  );

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-neon-gold">
            Portfolio manager
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Holdings</h1>
          <p className="mt-2 max-w-2xl text-gray-400">
            Book composition, marks, and P/L across domains and real estate. Open Properties for
            formula intelligence on listings you own or are only eyeing.
          </p>
        </div>
        <Link
          href="/portfolio/new"
          className="rounded-lg bg-neon-cyan/20 px-4 py-2 text-sm text-neon-cyan shadow-neon hover:bg-neon-cyan/30"
        >
          Add holding
        </Link>
      </header>

      <Nav />

      <section className="mb-6">
        <MetricPills
          items={[
            { label: "COST", value: formatMoney(summary.total_cost), tone: "info" },
            { label: "MARK", value: formatMoney(summary.total_value), tone: "ok" },
            {
              label: "P/L",
              value: formatSignedMoney(summary.unrealized_pl),
              tone: (summary.unrealized_pl ?? 0) >= 0 ? "ok" : "bad",
            },
            {
              label: "ACTIVE",
              value: String(summary.domain_count + summary.real_estate_count),
              tone: "warn",
            },
          ]}
        />
      </section>

      <section className="mb-8 grid gap-4 lg:grid-cols-3">
        <ChartCard
          index={1}
          title="Base composition"
          accent="lime"
          caption="Domains vs real estate by current mark — like a composition chart for the book."
          className="lg:col-span-1"
        >
          <CompositionDonut
            slices={[
              { label: "Domains", value: summary.domain_value || 0, color: "var(--neon-cyan)" },
              {
                label: "Real estate",
                value: summary.real_estate_value || 0,
                color: "var(--neon-green)",
              },
            ]}
          />
        </ChartCard>

        <ChartCard
          index={2}
          title="Signal narrowing"
          accent="purple"
          caption="Halving view of book concentration — fewer segments as allocation clarifies."
        >
          <HalvingBars
            levels={[
              100,
              Math.max(20, alloc.domain || alloc.realEstate || 40),
              Math.max(12, Math.round((alloc.domain || 50) / 2)),
              18,
              10,
            ]}
          />
          <p className="mt-3 text-xs text-gray-400">
            Domains {alloc.domain}% · Real estate {alloc.realEstate}%
          </p>
        </ChartCard>

        <ChartCard
          index={3}
          title="Book workflow"
          accent="cyan"
          caption="From ingest to outlook — the same pipeline that feeds property intelligence."
        >
          <IntelligenceWorkflow />
          <p className="mt-4 text-xs text-gray-500">
            {summary.owned_count} owned · {summary.listed_count} listed · {summary.watchlist_count}{" "}
            watchlist
          </p>
        </ChartCard>
      </section>

      <div className="rounded-2xl border border-surface-border bg-surface-raised/80">
        <div className="flex flex-wrap items-center gap-2 border-b border-surface-border px-5 py-4">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setTypeFilter(f.key)}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                typeFilter === f.key
                  ? "bg-neon-cyan/20 text-neon-cyan"
                  : "text-gray-400 hover:bg-surface-border hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="mx-2 h-4 w-px bg-surface-border" />
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                statusFilter === f.key
                  ? "bg-surface-border text-white"
                  : "text-gray-500 hover:bg-surface-border hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-surface-border text-xs uppercase text-gray-500">
                <th className="px-5 py-3">Holding</th>
                <th className="px-5 py-3">Class</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Cost</th>
                <th className="px-5 py-3">Value</th>
                <th className="px-5 py-3">P/L</th>
                <th className="px-5 py-3">Detail</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-500">
                    No holdings yet. Add a property or a domain to start the book.
                  </td>
                </tr>
              ) : (
                assets.map((a) => {
                  const pl = unrealizedPl(a.acquisition_cost, a.current_value);
                  return (
                    <tr
                      key={a.id}
                      className="border-b border-surface-border/50 hover:bg-black/20"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/portfolio/${a.id}`}
                          className="font-medium text-neon-cyan hover:underline"
                        >
                          {a.name}
                        </Link>
                        {a.asset_type === "real_estate" && (
                          <p className="mt-0.5">
                            <Link
                              href={`/properties/${a.id}`}
                              className="text-xs text-neon-gold hover:underline"
                            >
                              Intelligence charts
                            </Link>
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3 capitalize text-gray-400">
                        {a.asset_type === "real_estate" ? "Real estate" : "Domain"}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="px-5 py-3 font-mono text-xs">
                        {formatMoney(a.acquisition_cost, a.currency)}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs">
                        {formatMoney(a.current_value, a.currency)}
                      </td>
                      <td className={`px-5 py-3 font-mono text-xs ${plClass(pl)}`}>
                        {formatSignedMoney(pl, a.currency)}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-400">
                        {a.asset_type === "domain"
                          ? a.domain?.registrar || a.domain?.tld || "—"
                          : [a.real_estate?.city, a.real_estate?.region]
                              .filter(Boolean)
                              .join(", ") ||
                            a.real_estate?.property_type ||
                            "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    owned: "border-neon-green/40 text-neon-green",
    listed: "border-neon-gold/40 text-neon-gold",
    watchlist: "border-neon-blue/40 text-neon-blue",
    sold: "border-neon-purple/40 text-neon-purple",
    discarded: "border-gray-500/40 text-gray-400",
  };
  return (
    <span
      className={`inline-block rounded-md border px-2 py-0.5 text-xs capitalize ${colors[status] ?? ""}`}
    >
      {status}
    </span>
  );
}
