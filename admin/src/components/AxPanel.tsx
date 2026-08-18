"use client";

import { useEffect, useMemo, useState } from "react";
import { DensityPathChart, MetricPills } from "@/components/charts";
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
};

type Tab = "insights" | "timeline" | "catalysts" | "topics" | "hotspots";

export function AxPanel({
  selected,
}: {
  selected: PropertyCard | null;
}) {
  const [tab, setTab] = useState<Tab>("insights");
  const [intel, setIntel] = useState<Intel | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selected) {
      setIntel(null);
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
    return [
      re?.property_type,
      re?.city,
      selected.outlook,
      selected.asset.status,
      re?.occupancy,
    ].filter(Boolean) as string[];
  }, [selected]);

  const pathPoints = useMemo(() => {
    if (!intel || !selected) return [];
    const base = selected.asset.current_value ?? selected.asset.acquisition_cost ?? 0;
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

  const tabs: { key: Tab; label: string }[] = [
    { key: "insights", label: "Insights" },
    { key: "timeline", label: "Timeline" },
    { key: "catalysts", label: "Projects" },
    { key: "topics", label: "Topics" },
    { key: "hotspots", label: "Hotspots" },
  ];

  if (!selected) {
    return (
      <aside className="flex h-full min-h-[480px] flex-col rounded-2xl border border-surface-border bg-[#0a0f18] p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-neon-gold">Ax Panel</p>
        <h2 className="mt-2 text-lg font-semibold">Property intelligence</h2>
        <p className="mt-3 text-sm text-gray-500">
          Select a listing to open past / present / future marks, related projects, and Domzop
          Formula outlook.
        </p>
      </aside>
    );
  }

  const re = selected.asset.real_estate;

  return (
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
        <div className="flex gap-1 overflow-x-auto pb-3">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs ${
                tab === t.key
                  ? "bg-neon-cyan/20 text-neon-cyan"
                  : "text-gray-500 hover:text-gray-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading && <p className="text-xs text-gray-500">Loading intelligence…</p>}

        {tab === "insights" && (
          <div className="space-y-4">
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Summary
              </h3>
              <p className="text-sm leading-relaxed text-gray-300">
                {intel?.snapshot.narrative ??
                  "Formula narrative will appear once intelligence loads."}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-neon-cyan/30 px-2.5 py-0.5 text-[11px] capitalize text-neon-cyan"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Keywords
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-surface-border bg-black/30 p-2">
                  <MiniBars
                    values={factors.map((f) => f.score)}
                    labels={factors.map((f) => f.label.slice(0, 3))}
                  />
                </div>
                <div className="rounded-xl border border-surface-border bg-black/30 p-2">
                  <DensityPathChart points={pathPoints} height={90} color="#38bdf8" />
                </div>
              </div>
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

        {tab === "timeline" && intel && (
          <div className="space-y-3">
            <DensityPathChart points={pathPoints} height={140} />
            <div className="grid gap-2">
              {(
                [
                  ["1 year", intel.result.predicted_value.y1, intel.result.predicted_delta_pct.y1],
                  ["3 years", intel.result.predicted_value.y3, intel.result.predicted_delta_pct.y3],
                  ["5 years", intel.result.predicted_value.y5, intel.result.predicted_delta_pct.y5],
                ] as const
              ).map(([label, value, delta]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-lg border border-surface-border px-3 py-2 text-sm"
                >
                  <span className="text-gray-400">{label}</span>
                  <span className="font-medium">{formatMoney(value, selected.asset.currency)}</span>
                  <span className={plClass(delta)}>
                    {delta > 0 ? "+" : ""}
                    {delta.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "catalysts" && (
          <ul className="space-y-2">
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
                <p className="mt-1 text-xs capitalize text-gray-500">
                  {c.category.replace("_", " ")} · {c.status} · conf {c.confidence}
                </p>
              </li>
            ))}
            {!intel?.catalysts?.length && (
              <p className="text-sm text-gray-500">No related projects yet.</p>
            )}
          </ul>
        )}

        {tab === "topics" && (
          <div className="space-y-3">
            {factors.map((f) => (
              <div key={f.key}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>{f.label}</span>
                  <span className="capitalize text-gray-500">{f.direction}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-border">
                  <div
                    className="h-full rounded-full bg-neon-cyan"
                    style={{ width: `${Math.min(100, f.score)}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-gray-500">{f.note}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "hotspots" && (
          <div className="space-y-3">
            {(intel?.catalysts ?? [])
              .slice()
              .sort((a, b) => Math.abs(b.impact_weight) - Math.abs(a.impact_weight))
              .map((c) => {
                const pct = Math.min(100, Math.abs(c.impact_weight));
                return (
                  <div key={c.id} className="flex items-center gap-3 text-xs">
                    <span className="w-10 tabular-nums text-neon-cyan">{pct.toFixed(1)}%</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-border">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background:
                            c.impact_direction === "positive"
                              ? "var(--neon-green)"
                              : "var(--neon-red)",
                        }}
                      />
                    </div>
                    <span className="w-24 truncate text-gray-400">{c.name}</span>
                    <span className="w-8 text-right text-gray-500">{c.confidence}</span>
                  </div>
                );
              })}
            {!intel?.catalysts?.length && (
              <p className="text-sm text-gray-500">Hotspots appear from related projects.</p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function MiniBars({ values, labels }: { values: number[]; labels: string[] }) {
  if (!values.length) {
    return <p className="p-4 text-center text-[11px] text-gray-500">No factor bars</p>;
  }
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-[90px] items-end gap-1 px-1">
      {values.map((v, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t bg-neon-blue"
            style={{
              height: `${(v / max) * 70}px`,
              boxShadow: "0 0 8px rgba(56,189,248,0.35)",
            }}
          />
          <span className="text-[8px] uppercase text-gray-500">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}
