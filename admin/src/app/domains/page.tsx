"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AxDialog } from "@/components/AxDialog";
import { ModuleSwitcher } from "@/components/ModuleSwitcher";
import { StatsBar } from "@/components/StatsBar";
import {
  DensityPathChart,
  HotspotRows,
  InteractiveBars,
  MetricPills,
} from "@/components/charts";
import { SpringChip, SpringPress } from "@/components/Spring";
import type { DeepDomainIntelligence } from "@/lib/deep-types";
import type { DemoCandidate } from "@/lib/demo-domains";

const STATUS_FILTERS = ["all", "monitoring", "evaluated", "purchased", "discarded"] as const;

export default function DomainsModulePage() {
  const [candidates, setCandidates] = useState<DemoCandidate[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deep, setDeep] = useState<DeepDomainIntelligence | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSection, setDialogSection] = useState("overview");
  const [source, setSource] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const qs = filter !== "all" ? `?status=${filter}` : "";
    const res = await fetch(`/api/candidates${qs}`);
    const data = await res.json();
    const list = data.candidates ?? [];
    setCandidates(list);
    setSource(data.source ?? "");
    setSelectedId((prev) =>
      prev && list.some((c: DemoCandidate) => c.id === prev) ? prev : list[0]?.id ?? null,
    );
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setDeep(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/domains/${selectedId}/intelligence`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.deep) setDeep(data.deep);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const selected = candidates.find((c) => c.id === selectedId) ?? null;

  const keywordBars = useMemo(
    () =>
      (deep?.formula_steps ?? []).map((s) => ({
        label: s.name.slice(0, 3),
        fullLabel: s.name,
        value: Math.min(100, Math.round(s.contribution * 2.5)),
      })),
    [deep],
  );

  const pathPoints = useMemo(
    () =>
      (deep?.traffic_proxy ?? []).map((t) => ({
        label: t.month,
        value: t.score,
      })),
    [deep],
  );

  const hotspotRows = useMemo(
    () =>
      (deep?.competitors ?? []).map((c, i) => ({
        id: `${c.domain}-${i}`,
        label: c.domain,
        pct: c.strength,
        count: Math.round(c.strength / 10),
        positive: c.strength >= 55,
      })),
    [deep],
  );

  function openDeep(section: string) {
    setDialogSection(section);
    setDialogOpen(true);
  }

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-8 lg:px-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-neon-gold">
            Domain module
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Domain research</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-400">
            Pipeline candidates with Ax Insights — summary, keywords, and hotspots — plus deep
            dialogs for news, formula, and projections.
          </p>
        </div>
        <Link
          href="/reports"
          className="rounded-lg bg-neon-cyan/20 px-4 py-2 text-sm text-neon-cyan spring-press"
        >
          Reports
        </Link>
      </header>

      <ModuleSwitcher />
      <StatsBar />
      {source === "demo" && (
        <p className="mb-3 text-xs text-neon-gold">
          Showing sample domain candidates until the research DB is connected.
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
        <div className="rounded-xl border border-surface-border bg-surface-raised">
          <div className="flex flex-wrap items-center gap-2 border-b border-surface-border px-5 py-4">
            {STATUS_FILTERS.map((s) => (
              <SpringChip
                key={s}
                active={filter === s}
                onClick={() => setFilter(s)}
                className={`rounded-lg px-3 py-1.5 text-sm capitalize ${
                  filter === s
                    ? "bg-neon-cyan/20 text-neon-cyan"
                    : "text-gray-400 hover:bg-surface-border hover:text-white"
                }`}
              >
                {s}
              </SpringChip>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-surface-border text-xs uppercase text-gray-500">
                  <th className="px-5 py-3">Project</th>
                  <th className="px-5 py-3">.com</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Invest</th>
                  <th className="px-5 py-3">Quality</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-gray-500">
                      Loading…
                    </td>
                  </tr>
                ) : (
                  candidates.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className={`cursor-pointer border-b border-surface-border/50 hover:bg-black/20 ${
                        c.id === selectedId ? "bg-neon-cyan/10" : ""
                      }`}
                    >
                      <td className="px-5 py-3">
                        <p className="font-medium text-neon-cyan">{c.project_slug}</p>
                        <p className="text-xs capitalize text-gray-500">
                          {c.platform}
                          {c.category ? ` · ${c.category}` : ""}
                        </p>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs">{c.com_domain}</td>
                      <td className="px-5 py-3 capitalize text-gray-400">{c.status}</td>
                      <td className="px-5 py-3 text-neon-gold">
                        {c.investment_score ?? "—"}
                      </td>
                      <td className="px-5 py-3">{c.quality_score ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="flex min-h-[480px] flex-col overflow-hidden rounded-2xl border border-surface-border bg-[#0a0f18]">
          {!selected ? (
            <p className="p-4 text-sm text-gray-500">
              Select a domain candidate for Ax Insights.
            </p>
          ) : (
            <>
              <div className="border-b border-surface-border px-4 pt-4 pb-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-neon-gold">
                  Ax Panel · Domains
                </p>
                <h2 className="mt-1 text-lg font-semibold">{selected.com_domain}</h2>
                <p className="text-xs text-gray-500">{selected.deploy_url}</p>
                <SpringPress
                  onClick={() => openDeep("overview")}
                  className="mt-3 w-full rounded-lg bg-neon-cyan/15 px-3 py-2 text-xs font-semibold text-neon-cyan"
                >
                  Open deep Ax dialog →
                </SpringPress>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {deep ? (
                  <>
                    <section className="rounded-xl border border-surface-border/80 bg-black/25 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Summary
                        </h3>
                        <button
                          onClick={() => openDeep("overview")}
                          className="text-[10px] text-neon-cyan hover:underline"
                        >
                          Expand
                        </button>
                      </div>
                      <p className="text-sm leading-relaxed text-gray-300 line-clamp-4">
                        {deep.headline}. {deep.thesis}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {deep.keywords.slice(0, 8).map((k) => (
                          <SpringChip
                            key={k}
                            onClick={() => openDeep("news")}
                            className="rounded-full border border-neon-cyan/30 px-2.5 py-0.5 text-[11px] text-neon-cyan"
                          >
                            {k}
                          </SpringChip>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-xl border border-surface-border/80 bg-black/25 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Keywords
                        </h3>
                        <button
                          onClick={() => openDeep("formula")}
                          className="text-[10px] text-neon-cyan hover:underline"
                        >
                          Formula
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-surface-border bg-black/30 p-2">
                          <InteractiveBars
                            items={keywordBars}
                            onBarClick={() => openDeep("formula")}
                          />
                        </div>
                        <div className="rounded-xl border border-surface-border bg-black/30 p-2">
                          <DensityPathChart
                            points={pathPoints}
                            height={100}
                            color="#c084fc"
                            onPointClick={() => openDeep("projections")}
                          />
                        </div>
                      </div>
                    </section>

                    <section className="rounded-xl border border-surface-border/80 bg-black/25 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Hotspots
                        </h3>
                        <button
                          onClick={() => openDeep("competitors")}
                          className="text-[10px] text-neon-cyan hover:underline"
                        >
                          Competitors
                        </button>
                      </div>
                      <HotspotRows
                        rows={hotspotRows}
                        onRowClick={() => openDeep("competitors")}
                      />
                    </section>

                    <MetricPills
                      items={[
                        { label: "SCORE", value: String(deep.opportunity_score), tone: "ok" },
                        { label: "BRAND", value: String(deep.brandability), tone: "info" },
                        { label: "CAT", value: deep.category, tone: "warn" },
                      ]}
                    />
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Loading intelligence…</p>
                )}
              </div>
            </>
          )}
        </aside>
      </div>

      <AxDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        mode="domain"
        title={selected?.com_domain ?? "Domain"}
        domainDeep={deep}
        initialSection={dialogSection}
      />
    </main>
  );
}
