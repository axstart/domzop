"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Nav } from "@/components/Nav";
import {
  CatalystNetwork,
  ChartCard,
  DensityPathChart,
  FactorMatrix,
  HashLookupScore,
  ImpactTree,
  IntelligenceWorkflow,
  MetricPills,
  TimelineSequence,
} from "@/components/charts";
import { formatMoney, plClass } from "@/lib/money";
import type {
  AssetStatus,
  CatalystCategory,
  CatalystDirection,
  CatalystHorizon,
  CatalystStatus,
  IntelligenceOutlook,
  PortfolioAsset,
  PropertyCatalyst,
  Valuation,
  ValuationSource,
} from "@/lib/portfolio-types";

const inputClass =
  "rounded-lg border border-surface-border bg-black/40 px-3 py-2 text-sm text-gray-100";
const labelClass = "mb-1 block text-xs uppercase tracking-wide text-gray-500";

type Factor = {
  key: string;
  label: string;
  score: number;
  direction: "tailwind" | "headwind" | "neutral";
  note: string;
};

type IntelligencePayload = {
  asset: PortfolioAsset;
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
    future_json: Record<string, unknown>;
    formula_version: string;
    generated_at: string;
  };
  result: {
    predicted_delta_pct: { y1: number; y3: number; y5: number };
    predicted_value: { y1: number | null; y3: number | null; y5: number | null };
    yield_pct: number | null;
    version: string;
  };
  catalysts: PropertyCatalyst[];
  valuations: Valuation[];
};

function adminHeaders() {
  return {
    "Content-Type": "application/json",
    "x-admin-secret": process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "",
  };
}

const CATEGORIES: CatalystCategory[] = [
  "infra",
  "transit",
  "zoning",
  "commercial",
  "residential",
  "amenities",
  "competing_supply",
  "environmental",
  "policy",
  "other",
];

export default function PropertyIntelligencePage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<IntelligencePayload | null>(null);
  const [tab, setTab] = useState<"past" | "present" | "future">("present");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cat, setCat] = useState({
    name: "",
    description: "",
    category: "infra" as CatalystCategory,
    status: "proposed" as CatalystStatus,
    impact_direction: "positive" as CatalystDirection,
    impact_weight: "40",
    confidence: "60",
    horizon: "mid" as CatalystHorizon,
  });
  const [mark, setMark] = useState({ value: "", source: "estimate" as ValuationSource, notes: "" });

  const load = useCallback(async () => {
    const res = await fetch(`/api/properties/${params.id}/intelligence`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Unable to load intelligence");
      return;
    }
    setData(json);
    setError(null);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function recompute() {
    setBusy(true);
    await fetch(`/api/properties/${params.id}/intelligence`, {
      method: "POST",
      headers: adminHeaders(),
    });
    await load();
    setBusy(false);
  }

  async function toggleMode(status: AssetStatus) {
    setBusy(true);
    await fetch(`/api/portfolio/${params.id}`, {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify({ status }),
    });
    await load();
    setBusy(false);
  }

  async function addCatalyst() {
    if (!cat.name.trim()) return;
    setBusy(true);
    await fetch(`/api/properties/${params.id}/catalysts`, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({
        ...cat,
        impact_weight: Number(cat.impact_weight),
        confidence: Number(cat.confidence),
      }),
    });
    setCat({ ...cat, name: "", description: "" });
    await recompute();
  }

  async function removeCatalyst(id: string) {
    setBusy(true);
    await fetch(`/api/properties/${params.id}/catalysts/${id}`, {
      method: "DELETE",
      headers: adminHeaders(),
    });
    await recompute();
  }

  async function addMark() {
    const value = Number(mark.value);
    if (!Number.isFinite(value)) return;
    setBusy(true);
    await fetch(`/api/portfolio/${params.id}/valuations`, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({ value, source: mark.source, notes: mark.notes || null }),
    });
    setMark({ value: "", source: "estimate", notes: "" });
    await recompute();
  }

  const pathPoints = useMemo(() => {
    if (!data) return [];
    const { asset, snapshot, result, valuations } = data;
    const base =
      Number(snapshot.present_json?.estimate) ||
      asset.current_value ||
      asset.acquisition_cost ||
      0;
    const pastMarks = [...valuations]
      .sort((a, b) => +new Date(a.valued_at) - +new Date(b.valued_at))
      .slice(-3)
      .map((v, i) => ({
        label: i === 0 ? "Past" : `M${i}`,
        value: Number(v.value),
      }));
    if (pastMarks.length === 0 && asset.acquisition_cost != null) {
      pastMarks.push({ label: "Acquire", value: Number(asset.acquisition_cost) });
    }
    return [
      ...pastMarks,
      { label: "Now", value: Number(base) },
      { label: "1y", value: Number(result.predicted_value.y1 ?? base), future: true },
      { label: "3y", value: Number(result.predicted_value.y3 ?? base), future: true },
      { label: "5y", value: Number(result.predicted_value.y5 ?? base), future: true },
    ].filter((p) => Number.isFinite(p.value) && p.value > 0);
  }, [data]);

  if (error && !data) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Nav />
        <p className="text-neon-red">{error}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Nav />
        <p className="text-gray-500">Loading intelligence…</p>
      </main>
    );
  }

  const { asset, snapshot, result, catalysts, valuations } = data;
  const re = asset.real_estate;
  const factors = Array.isArray(snapshot.factors) ? (snapshot.factors as Factor[]) : [];
  const lift = catalysts.filter((c) => c.impact_direction === "positive");
  const pressure = catalysts.filter((c) => c.impact_direction === "negative");
  const present = snapshot.present_json ?? {};
  const past = snapshot.past_json ?? {};
  const events = Array.isArray(past.events) ? (past.events as Array<Record<string, unknown>>) : [];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Nav />
      <Link href="/properties" className="text-sm text-neon-cyan hover:underline">
        ← Available properties
      </Link>

      <header className="mt-4 mb-6 flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-sm uppercase tracking-widest text-neon-gold">Property intelligence</p>
          <h1 className="mt-1 text-3xl font-bold">{asset.name}</h1>
          <p className="mt-1 text-gray-400">
            {[re?.address, re?.city, re?.region, re?.country].filter(Boolean).join(", ")}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Formula {snapshot.formula_version} · internal model ·{" "}
            {new Date(snapshot.generated_at).toLocaleString()}
          </p>
        </div>
        <HashLookupScore score={snapshot.intelligence_score} label={snapshot.outlook} />
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {(["watchlist", "owned", "listed"] as AssetStatus[]).map((s) => (
          <button
            key={s}
            disabled={busy}
            onClick={() => toggleMode(s)}
            className={`rounded-lg border px-3 py-1.5 text-sm capitalize ${
              asset.status === s
                ? "border-neon-cyan text-neon-cyan shadow-neon"
                : "border-surface-border text-gray-400"
            }`}
          >
            {s === "watchlist" ? "Watching" : s}
          </button>
        ))}
        <button
          disabled={busy}
          onClick={recompute}
          className="rounded-lg bg-neon-cyan/20 px-3 py-1.5 text-sm text-neon-cyan disabled:opacity-50"
        >
          {busy ? "Updating…" : "Recompute"}
        </button>
        <Link
          href={`/portfolio/${asset.id}`}
          className="rounded-lg px-3 py-1.5 text-sm text-gray-400 hover:text-white"
        >
          Edit book
        </Link>
      </div>

      <section className="mb-6">
        <MetricPills
          items={[
            {
              label: "NOW",
              value: formatMoney((present.estimate as number) ?? asset.current_value, asset.currency),
              tone: "info",
            },
            {
              label: "1Y",
              value: formatMoney(snapshot.predicted_value_1y, asset.currency),
              tone: result.predicted_delta_pct.y1 >= 0 ? "ok" : "bad",
            },
            {
              label: "3Y",
              value: formatMoney(snapshot.predicted_value_3y, asset.currency),
              tone: result.predicted_delta_pct.y3 >= 0 ? "ok" : "bad",
            },
            {
              label: "5Y",
              value: formatMoney(snapshot.predicted_value_5y, asset.currency),
              tone: result.predicted_delta_pct.y5 >= 0 ? "ok" : "bad",
            },
            {
              label: "YIELD",
              value: result.yield_pct != null ? `${result.yield_pct}%` : "—",
              tone: "warn",
            },
          ]}
        />
      </section>

      <section className="mb-8 grid gap-4 lg:grid-cols-3">
        <ChartCard
          index={1}
          title="Density path"
          accent="cyan"
          caption="Past marks → present → 1y / 3y / 5y formula path (chromatography-style)."
          className="lg:col-span-2"
        >
          <DensityPathChart points={pathPoints} />
        </ChartCard>
        <ChartCard
          index={2}
          title="Intelligence workflow"
          accent="orange"
          caption="Ingest → mark → catalysts → formula → outlook."
        >
          <IntelligenceWorkflow />
        </ChartCard>
      </section>

      <section className="mb-8 grid gap-4 lg:grid-cols-2">
        <ChartCard
          index={3}
          title="Related project map"
          accent="green"
          caption="Node links from this property to side projects that may lift or pressure value."
        >
          <CatalystNetwork
            centerLabel="Site"
            nodes={catalysts.map((c) => ({
              id: c.id,
              label: c.name,
              positive: c.impact_direction === "positive",
            }))}
          />
        </ChartCard>
        <ChartCard
          index={4}
          title="Impact tree"
          accent="pink"
          caption="Branching scenarios — lift vs pressure counts feeding the formula."
        >
          <ImpactTree liftCount={lift.length} pressureCount={pressure.length} />
        </ChartCard>
      </section>

      <ChartCard
        index={5}
        title="Narrative"
        accent="gold"
        caption="AI or heuristic read of the formula factors."
        className="mb-8"
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
          {snapshot.narrative}
        </p>
      </ChartCard>

      <div className="mb-4">
        <TimelineSequence active={tab} onSelect={setTab} />
      </div>

      {tab === "past" && (
        <ChartCard index={6} title="Past marks" accent="purple" className="mb-8">
          {events.length === 0 ? (
            <p className="text-sm text-gray-500">
              No historical marks yet. Add a valuation to seed the past.
            </p>
          ) : (
            <ul className="space-y-3 text-sm">
              {events.map((e, i) => (
                <li
                  key={i}
                  className="flex justify-between border-b border-surface-border/40 pb-2"
                >
                  <span className="text-gray-400">
                    {e.at ? new Date(String(e.at)).toLocaleDateString() : "—"} · {String(e.label)}
                  </span>
                  <span className="font-mono text-neon-cyan">
                    {formatMoney(e.value as number, asset.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      )}

      {tab === "present" && (
        <ChartCard index={6} title="Present snapshot" accent="cyan" className="mb-8">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Row label="Occupancy" value={String(present.occupancy ?? re?.occupancy ?? "—")} />
            <Row
              label="Gross yield"
              value={result.yield_pct != null ? `${result.yield_pct}%` : "—"}
            />
            <Row
              label="Location momentum"
              value={String(present.location_momentum ?? re?.location_momentum ?? "—")}
            />
            <Row
              label="Condition"
              value={String(present.condition_score ?? re?.condition_score ?? "—")}
            />
            <Row label="Monthly rent" value={formatMoney(re?.monthly_rent, asset.currency)} />
            <Row label="Annual taxes" value={formatMoney(re?.annual_taxes, asset.currency)} />
            <Row label="Type" value={re?.property_type ?? "—"} />
            <Row label="Status" value={asset.status} />
          </dl>
        </ChartCard>
      )}

      {tab === "future" && (
        <ChartCard
          index={6}
          title="Future marks"
          accent="gold"
          caption="Predicted path from Domzop Formula — not a market quote."
          className="mb-8"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                ["1 year", result.predicted_value.y1, result.predicted_delta_pct.y1],
                ["3 years", result.predicted_value.y3, result.predicted_delta_pct.y3],
                ["5 years", result.predicted_value.y5, result.predicted_delta_pct.y5],
              ] as const
            ).map(([label, value, delta]) => (
              <div
                key={label}
                className="rounded-xl border border-neon-gold/30 bg-black/30 px-4 py-3"
              >
                <p className="text-xs uppercase text-neon-gold">{label}</p>
                <p className="mt-1 text-lg font-semibold">{formatMoney(value, asset.currency)}</p>
                <p className={`text-xs ${plClass(delta)}`}>
                  {delta > 0 ? "+" : ""}
                  {delta}%
                </p>
              </div>
            ))}
          </div>
        </ChartCard>
      )}

      <ChartCard
        index={7}
        title="Projects that may lift / pressure"
        accent="lime"
        caption="Side projects enter the formula as signed catalysts."
        className="mb-8"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm text-neon-green">May lift value</h3>
            {lift.length === 0 && <p className="text-sm text-gray-500">None yet.</p>}
            {lift.map((c) => (
              <CatalystRow key={c.id} c={c} onRemove={() => removeCatalyst(c.id)} />
            ))}
          </div>
          <div>
            <h3 className="mb-2 text-sm text-neon-red">May pressure value</h3>
            {pressure.length === 0 && <p className="text-sm text-gray-500">None yet.</p>}
            {pressure.map((c) => (
              <CatalystRow key={c.id} c={c} onRemove={() => removeCatalyst(c.id)} />
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-3 border-t border-surface-border pt-4 sm:grid-cols-2">
          <input
            className={inputClass}
            placeholder="Related project name"
            value={cat.name}
            onChange={(e) => setCat({ ...cat, name: e.target.value })}
          />
          <input
            className={inputClass}
            placeholder="Short description"
            value={cat.description}
            onChange={(e) => setCat({ ...cat, description: e.target.value })}
          />
          <select
            className={inputClass}
            value={cat.category}
            onChange={(e) => setCat({ ...cat, category: e.target.value as CatalystCategory })}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace("_", " ")}
              </option>
            ))}
          </select>
          <select
            className={inputClass}
            value={cat.status}
            onChange={(e) => setCat({ ...cat, status: e.target.value as CatalystStatus })}
          >
            <option value="rumored">rumored</option>
            <option value="proposed">proposed</option>
            <option value="underway">underway</option>
            <option value="completed">completed</option>
          </select>
          <select
            className={inputClass}
            value={cat.impact_direction}
            onChange={(e) =>
              setCat({ ...cat, impact_direction: e.target.value as CatalystDirection })
            }
          >
            <option value="positive">positive (lift)</option>
            <option value="negative">negative (pressure)</option>
          </select>
          <select
            className={inputClass}
            value={cat.horizon}
            onChange={(e) => setCat({ ...cat, horizon: e.target.value as CatalystHorizon })}
          >
            <option value="near">near</option>
            <option value="mid">mid</option>
            <option value="long">long</option>
          </select>
          <div>
            <label className={labelClass}>Impact weight (−100 to 100)</label>
            <input
              type="number"
              className={inputClass + " w-full"}
              value={cat.impact_weight}
              onChange={(e) => setCat({ ...cat, impact_weight: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Confidence (0–100)</label>
            <input
              type="number"
              className={inputClass + " w-full"}
              value={cat.confidence}
              onChange={(e) => setCat({ ...cat, confidence: e.target.value })}
            />
          </div>
        </div>
        <button
          onClick={addCatalyst}
          disabled={busy}
          className="mt-4 rounded-lg bg-neon-green/20 px-4 py-2 text-sm text-neon-green hover:bg-neon-green/30 disabled:opacity-50"
        >
          Add related project
        </button>
      </ChartCard>

      <ChartCard
        index={8}
        title="Formula matrix"
        accent="pink"
        caption="Factor names and direction only — nested-grid style. Mix weights stay internal."
        className="mb-8"
      >
        <FactorMatrix factors={factors} />
      </ChartCard>

      <ChartCard index={9} title="Add a valuation mark" accent="blue">
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            type="number"
            placeholder="Value"
            className={inputClass}
            value={mark.value}
            onChange={(e) => setMark({ ...mark, value: e.target.value })}
          />
          <select
            className={inputClass}
            value={mark.source}
            onChange={(e) => setMark({ ...mark, source: e.target.value as ValuationSource })}
          >
            <option value="estimate">estimate</option>
            <option value="manual">manual</option>
            <option value="appraisal">appraisal</option>
          </select>
          <input
            placeholder="Notes"
            className={inputClass}
            value={mark.notes}
            onChange={(e) => setMark({ ...mark, notes: e.target.value })}
          />
        </div>
        <button
          onClick={addMark}
          disabled={busy}
          className="mt-4 rounded-lg bg-neon-cyan/20 px-4 py-2 text-sm text-neon-cyan disabled:opacity-50"
        >
          Record mark
        </button>
        {valuations.length > 0 && (
          <p className="mt-3 text-xs text-gray-500">{valuations.length} mark(s) on file.</p>
        )}
      </ChartCard>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 rounded-lg border border-surface-border/60 px-3 py-2">
      <dt className="text-gray-500">{label}</dt>
      <dd className="capitalize text-gray-200">{value}</dd>
    </div>
  );
}

function CatalystRow({ c, onRemove }: { c: PropertyCatalyst; onRemove: () => void }) {
  return (
    <div className="mb-2 rounded-lg border border-surface-border/80 bg-black/20 p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{c.name}</p>
          <p className="text-xs capitalize text-gray-500">
            {c.category.replace("_", " ")} · {c.status} · {c.horizon} · confidence {c.confidence}
          </p>
          {c.description && <p className="mt-1 text-xs text-gray-400">{c.description}</p>}
        </div>
        <button onClick={onRemove} className="text-xs text-gray-500 hover:text-neon-red">
          Remove
        </button>
      </div>
    </div>
  );
}
