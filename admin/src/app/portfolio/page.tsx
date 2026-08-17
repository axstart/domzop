"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Nav } from "@/components/Nav";
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
          <p className="text-sm font-medium uppercase tracking-widest text-accent-muted">
            Portfolio manager
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Holdings</h1>
          <p className="mt-2 max-w-2xl text-gray-400">
            Track domains and real estate in one book: cost basis, marks, status, and simple
            performance.
          </p>
        </div>
        <Link
          href="/portfolio/new"
          className="rounded-lg bg-accent px-4 py-2 text-sm hover:bg-accent/80"
        >
          Add holding
        </Link>
      </header>

      <Nav />

      <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard label="Total cost" value={formatMoney(summary.total_cost)} />
        <SummaryCard label="Current value" value={formatMoney(summary.total_value)} accent />
        <SummaryCard
          label="Unrealized P/L"
          value={formatSignedMoney(summary.unrealized_pl)}
          className={plClass(summary.unrealized_pl)}
        />
        <SummaryCard
          label="Active holdings"
          value={String(summary.domain_count + summary.real_estate_count)}
          hint={`${summary.domain_count} domains · ${summary.real_estate_count} real estate`}
        />
      </section>

      <section className="mb-8 rounded-xl border border-surface-border bg-surface-raised p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Allocation
          </h2>
          <p className="text-xs text-gray-500">
            Owned + listed marks · {summary.owned_count} owned · {summary.listed_count} listed
            {summary.watchlist_count ? ` · ${summary.watchlist_count} watchlist` : ""}
          </p>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-surface-border">
          <div className="flex h-full">
            <div
              className="bg-accent transition-all"
              style={{ width: `${alloc.domain}%` }}
              title={`Domains ${alloc.domain}%`}
            />
            <div
              className="bg-emerald-500 transition-all"
              style={{ width: `${alloc.realEstate}%` }}
              title={`Real estate ${alloc.realEstate}%`}
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-6 text-sm">
          <div>
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-accent" />
            Domains {alloc.domain}% · {formatMoney(summary.domain_value)}
          </div>
          <div>
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500" />
            Real estate {alloc.realEstate}% · {formatMoney(summary.real_estate_value)}
          </div>
        </div>
      </section>

      <div className="rounded-xl border border-surface-border bg-surface-raised">
        <div className="flex flex-wrap items-center gap-2 border-b border-surface-border px-5 py-4">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setTypeFilter(f.key)}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                typeFilter === f.key
                  ? "bg-accent text-white"
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
                      className="border-b border-surface-border/50 hover:bg-surface/50"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/portfolio/${a.id}`}
                          className="font-medium text-accent-muted hover:underline"
                        >
                          {a.name}
                        </Link>
                        {a.candidate_id && (
                          <p className="mt-0.5 text-xs text-gray-500">Linked from research lab</p>
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
                              .join(", ") || a.real_estate?.property_type || "—"}
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

function SummaryCard({
  label,
  value,
  hint,
  accent,
  className = "text-gray-100",
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised px-5 py-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent ? "text-accent-muted" : className}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    owned: "bg-emerald-500/20 text-emerald-300",
    listed: "bg-amber-500/20 text-amber-300",
    watchlist: "bg-blue-500/20 text-blue-300",
    sold: "bg-purple-500/20 text-purple-300",
    discarded: "bg-gray-500/20 text-gray-400",
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs capitalize ${colors[status] ?? ""}`}
    >
      {status}
    </span>
  );
}
