"use client";

import { useEffect, useMemo, useState } from "react";
import { AxDialog } from "@/components/AxDialog";
import {
  DensityPathChart,
  HotspotRows,
  InteractiveBars,
  MetricPills,
} from "@/components/charts";
import { SpringChip, SpringPress } from "@/components/Spring";
import type { DeepPropertyIntelligence } from "@/lib/deep-types";
import { formatMoney, plClass } from "@/lib/money";
import type { IntelligenceOutlook, PropertyCard } from "@/lib/portfolio-types";

type Factor = {
  key: string;
  label: string;
  score: number;
  direction: string;
  note: string;
};

type Intel = {
  snapshot: {
    intelligence_score: number;
    predicted_delta_pct: number;
    predicted_value_1y: number | null;
    predicted_value_3y: number | null;
    predicted_value_5y: number | null;
    outlook: IntelligenceOutlook;
    narrative: string | null;
    factors: Factor[] | unknown;
    past_json: Record<string, unknown>;
    present_json: Record<string, unknown>;
  };
  result: {
    predicted_delta_pct: { y1: number; y3: number; y5: number };
    predicted_value: { y1: number | null; y3: number | null; y5: number | null };
    yield_pct: number | null;
  };
  catalysts: Array<{
    id: string;
    name: string;
    impact_direction: "positive" | "negative";
    impact_weight: number;
    confidence: number;
    category: string;
    status: string;
  }>;
  deep?: DeepPropertyIntelligence;
};

type Tab = "insights" | "timeline" | "catalysts" | "topics" | "hotspots" | "news";

export function AxPanel({ selected }: { selected: PropertyCard | null }) {
  const [tab, setTab] = useState<Tab>("insights");
  const [intel, setIntel] = useState<Intel | null>(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSection, setDialogSection] = useState("overview");

  useEffect(() => {
    if (!selected) {
      setIntel(null);
      setTab("insights");
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/properties/${selected.asset.id}/intelligence`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && !data.error) setIntel(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const tags = useMemo(() => {
    if (!selected) return [];
    const re = selected.asset.real_estate;
    const base = [
      re?.property_type,
      re?.city,
      selected.outlook,
      selected.asset.status,
      re?.occupancy,
    ].filter(Boolean) as string[];
    const newsTags = (intel?.deep?.news ?? []).flatMap((n) => n.tags).slice(0, 4);
    return [...base, ...newsTags].slice(0, 8);
  }, [selected, intel]);

  const pathPoints = useMemo(() => {
    if (!intel || !selected) return [];
    const base = selected.asset.current_value ?? selected.asset.acquisition_cost ?? 0;
    const hist = intel.deep?.rate_history;
    if (hist && hist.length >= 4) {
      const sampled = hist.filter((_, i) => i % 4 === 0 || i === hist.length - 1).slice(-5);
      return [
        ...sampled.map((h) => ({
          label: h.date.slice(2, 7),
          value: h.median_sale,
        })),
        { label: "1y", value: Number(intel.result.predicted_value.y1 ?? base), future: true },
        { label: "3y", value: Number(intel.result.predicted_value.y3 ?? base), future: true },
      ];
    }
    const past = Array.isArray(intel.snapshot.past_json?.events)
      ? (intel.snapshot.past_json.events as Array<{ label?: string; value: number }>)
      : [];
    return [
      ...past.slice(-2).map((e, i) => ({ label: e.label ?? `P${i}`, value: Number(e.value) })),
      { label: "Now", value: base },
      { label: "1y", value: Number(intel.result.predicted_value.y1 ?? base), future: true },
      { label: "3y", value: Number(intel.result.predicted_value.y3 ?? base), future: true },
      { label: "5y", value: Number(intel.result.predicted_value.y5 ?? base), future: true },
    ].filter((p) => Number.isFinite(p.value) && p.value > 0);
  }, [intel, selected]);

  const factors = Array.isArray(intel?.snapshot.factors)
    ? (intel!.snapshot.factors as Factor[])
    : [];

  const hotspotRows = useMemo(() => {
    const fromDeep = intel?.deep?.related_projects ?? [];
    if (fromDeep.length) {
      return fromDeep
        .slice()
        .sort((a, b) => Math.abs(b.impact_weight) - Math.abs(a.impact_weight))
        .slice(0, 6)
        .map((p) => ({
          id: p.id,
          label: p.name,
          pct: Math.min(100, Math.abs(p.impact_weight)),
          count: p.confidence,
          positive: p.impact_direction === "positive",
        }));
    }
    return (intel?.catalysts ?? [])
      .slice()
      .sort((a, b) => Math.abs(b.impact_weight) - Math.abs(a.impact_weight))
      .map((c) => ({
        id: c.id,
        label: c.name,
        pct: Math.min(100, Math.abs(c.impact_weight)),
        count: c.confidence,
        positive: c.impact_direction === "positive",
      }));
  }, [intel]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "insights", label: "Insights" },
    { key: "news", label: "News" },
    { key: "timeline", label: "Timeline" },
    { key: "catalysts", label: "Projects" },
    { key: "topics", label: "Topics" },
    { key: "hotspots", label: "Hotspots" },
  ];

  function openDeep(section: string) {
    setDialogSection(section);
    setDialogOpen(true);
  }

  if (!selected) {
    return (
      <aside className="flex h-full min-h-[480px] flex-col rounded-2xl border border-surface-border bg-[#0a0f18] p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-neon-gold">Ax Panel</p>
        <h2 className="mt-2 text-lg font-semibold">Property intelligence</h2>
        <p className="mt-3 text-sm text-gray-500">
          Select a listing for high-level Insights — summary, keywords, and hotspots — then drill
          into deep Ax dialogs.
        </p>
      </aside>
    );
  }

  const re = selected.asset.real_estate;
  const deepNews = intel?.deep?.news?.slice(0, 4) ?? [];
  const summaryText =
    intel?.deep?.headline
      ? `${intel.deep.headline}. ${intel.snapshot.narrative ?? intel.deep.thesis}`
      : intel?.snapshot.narrative ?? "Formula narrative will appear once intelligence loads.";

  return (
    <>
      <aside className="flex h-full min-h-[480px] flex-col overflow-hidden rounded-2xl border border-surface-border bg-[#0a0f18]">
        <div className="border-b border-surface-border px-4 pt-4">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-neon-gold">
                Ax Panel
              </p>
              <h2 className="mt-1 text-base font-semibold leading-snug">{selected.asset.name}</h2>
              <p className="text-xs text-gray-500">
                {[re?.city, re?.country].filter(Boolean).join(", ")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-neon-cyan">
                {Math.round(intel?.snapshot.intelligence_score ?? selected.intelligence_score ?? 0)}
              </p>
              <p className="text-[10px] uppercase text-gray-500">Score</p>
            </div>
          </div>
          <SpringPress
            onClick={() => openDeep("overview")}
            className="mb-3 w-full rounded-lg bg-neon-cyan/15 px-3 py-2 text-xs font-semibold text-neon-cyan hover:bg-neon-cyan/25"
          >
            Open deep Ax dialog →
          </SpringPress>
          <div className="flex gap-1 overflow-x-auto pb-3">
            {tabs.map((t) => (
              <SpringChip
                key={t.key}
                active={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs ${
                  tab === t.key
                    ? "bg-neon-cyan/20 text-neon-cyan"
                    : "text-gray-500 hover:text-gray-200"
                }`}
              >
                {t.label}
              </SpringChip>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && <p className="text-xs text-gray-500">Loading intelligence…</p>}

          {tab === "insights" && (
            <div className="space-y-5">
              {/* High-level Insights layout (reference style) */}
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
                <p className="text-sm leading-relaxed text-gray-300 line-clamp-4">{summaryText}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <SpringChip
                      key={tag}
                      onClick={() => openDeep("news")}
                      className="rounded-full border border-neon-cyan/30 px-2.5 py-0.5 text-[11px] capitalize text-neon-cyan"
                    >
                      {tag}
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
                      items={factors.map((f) => ({
                        label: f.label.slice(0, 3),
                        fullLabel: f.label,
                        value: f.score,
                      }))}
                      onBarClick={() => openDeep("formula")}
                    />
                  </div>
                  <div className="rounded-xl border border-surface-border bg-black/30 p-2">
                    <DensityPathChart
                      points={pathPoints}
                      height={100}
                      color="#38bdf8"
                      formatValue={(v) => formatMoney(v, selected.asset.currency)}
                      onPointClick={(pt) =>
                        openDeep(pt.future ? "projections" : "rates")
                      }
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
                    onClick={() => openDeep("projects")}
                    className="text-[10px] text-neon-cyan hover:underline"
                  >
                    Projects
                  </button>
                </div>
                <HotspotRows
                  rows={hotspotRows}
                  onRowClick={() => openDeep("projects")}
                />
              </section>

              <MetricPills
                items={[
                  {
                    label: "MARK",
                    value: formatMoney(
                      selected.asset.current_value ?? selected.asset.acquisition_cost,
                      selected.asset.currency,
                    ),
                    tone: "info",
                  },
                  {
                    label: "1Y",
                    value:
                      selected.predicted_delta_pct == null
                        ? "—"
                        : `${selected.predicted_delta_pct > 0 ? "+" : ""}${selected.predicted_delta_pct}%`,
                    tone: (selected.predicted_delta_pct ?? 0) >= 0 ? "ok" : "bad",
                  },
                  {
                    label: "OUTLOOK",
                    value: selected.outlook ?? "—",
                    tone:
                      selected.outlook === "bullish"
                        ? "ok"
                        : selected.outlook === "bearish"
                          ? "bad"
                          : "warn",
                  },
                ]}
              />
            </div>
          )}

          {tab === "news" && (
            <div className="space-y-3">
              <SpringPress
                onClick={() => openDeep("news")}
                className="text-xs text-neon-cyan hover:underline"
              >
                Open full news aggregator →
              </SpringPress>
              {deepNews.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => openDeep("news")}
                  className="w-full rounded-lg border border-surface-border bg-black/20 p-3 text-left spring-press"
                >
                  <p className="text-[10px] uppercase text-neon-gold">
                    {n.category} · {n.sentiment}
                  </p>
                  <p className="mt-1 text-sm font-medium">{n.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-gray-500">{n.summary}</p>
                </button>
              ))}
            </div>
          )}

          {tab === "timeline" && intel && (
            <div className="space-y-3">
              <DensityPathChart
                points={pathPoints}
                height={140}
                formatValue={(v) => formatMoney(v, selected.asset.currency)}
                onPointClick={(pt) => openDeep(pt.future ? "projections" : "rates")}
              />
              <div className="grid gap-2">
                {(
                  [
                    ["1 year", intel.result.predicted_value.y1, intel.result.predicted_delta_pct.y1],
                    ["3 years", intel.result.predicted_value.y3, intel.result.predicted_delta_pct.y3],
                    ["5 years", intel.result.predicted_value.y5, intel.result.predicted_delta_pct.y5],
                  ] as const
                ).map(([label, value, delta]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => openDeep("projections")}
                    className="flex items-center justify-between rounded-lg border border-surface-border px-3 py-2 text-sm spring-press"
                  >
                    <span className="text-gray-400">{label}</span>
                    <span className="font-medium">
                      {formatMoney(value, selected.asset.currency)}
                    </span>
                    <span className={plClass(delta)}>
                      {delta > 0 ? "+" : ""}
                      {delta.toFixed(1)}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "catalysts" && (
            <ul className="space-y-2">
              <SpringPress
                onClick={() => openDeep("projects")}
                className="mb-2 text-xs text-neon-cyan"
              >
                Full related-project dossiers →
              </SpringPress>
              {(intel?.catalysts ?? []).map((c) => (
                <li
                  key={c.id}
                  className="rounded-lg border border-surface-border bg-black/20 px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{c.name}</span>
                    <span
                      className={
                        c.impact_direction === "positive" ? "text-neon-green" : "text-neon-red"
                      }
                    >
                      {c.impact_direction === "positive" ? "lift" : "pressure"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {tab === "topics" && (
            <div className="space-y-3">
              <InteractiveBars
                items={factors.map((f) => ({
                  label: f.label.slice(0, 3),
                  fullLabel: f.label,
                  value: f.score,
                }))}
                onBarClick={() => openDeep("formula")}
              />
            </div>
          )}

          {tab === "hotspots" && (
            <HotspotRows rows={hotspotRows} onRowClick={() => openDeep("projects")} />
          )}
        </div>
      </aside>

      <AxDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        mode="property"
        title={selected.asset.name}
        propertyDeep={intel?.deep ?? null}
        initialSection={dialogSection}
      />
    </>
  );
}
