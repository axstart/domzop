"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
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
  "rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-gray-100";
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

function outlookClass(outlook: IntelligenceOutlook): string {
  if (outlook === "bullish") return "text-emerald-400";
  if (outlook === "bearish") return "text-rose-400";
  return "text-amber-300";
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

  if (error && !data) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Nav />
        <p className="text-rose-400">{error}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
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
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Nav />
      <Link href="/properties" className="text-sm text-accent-muted hover:underline">
        ← Available properties
      </Link>

      <header className="mt-4 mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-accent-muted">
            Property intelligence
          </p>
          <h1 className="mt-1 text-3xl font-bold">{asset.name}</h1>
          <p className="mt-1 text-gray-400">
            {[re?.address, re?.city, re?.region, re?.country].filter(Boolean).join(", ")}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Formula {snapshot.formula_version} · not an appraisal · scored {new Date(snapshot.generated_at).toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-bold text-accent-muted">
            {Math.round(snapshot.intelligence_score)}
          </p>
          <p className={`text-sm capitalize ${outlookClass(snapshot.outlook)}`}>{snapshot.outlook}</p>
        </div>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          disabled={busy}
          onClick={() => toggleMode("watchlist")}
          className={`rounded-lg px-3 py-1.5 text-sm ${
            asset.status === "watchlist" ? "bg-blue-600 text-white" : "bg-surface-border text-gray-400"
          }`}
        >
          Watching
        </button>
        <button
          disabled={busy}
          onClick={() => toggleMode("owned")}
          className={`rounded-lg px-3 py-1.5 text-sm ${
            asset.status === "owned" ? "bg-emerald-600 text-white" : "bg-surface-border text-gray-400"
          }`}
        >
          Owned
        </button>
        <button
          disabled={busy}
          onClick={() => toggleMode("listed")}
          className={`rounded-lg px-3 py-1.5 text-sm ${
            asset.status === "listed" ? "bg-amber-600 text-white" : "bg-surface-border text-gray-400"
          }`}
        >
          Listed
        </button>
        <button
          disabled={busy}
          onClick={recompute}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm hover:bg-accent/80 disabled:opacity-50"
        >
          {busy ? "Updating…" : "Recompute intelligence"}
        </button>
        <Link href={`/portfolio/${asset.id}`} className="rounded-lg px-3 py-1.5 text-sm text-gray-400 hover:text-white">
          Edit book
        </Link>
      </div>

      <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Present estimate"
          value={formatMoney((present.estimate as number) ?? asset.current_value, asset.currency)}
        />
        <Stat
          label="1y mark"
          value={formatMoney(snapshot.predicted_value_1y, asset.currency)}
          hint={`${result.predicted_delta_pct.y1 > 0 ? "+" : ""}${result.predicted_delta_pct.y1}%`}
          hintClass={plClass(result.predicted_delta_pct.y1)}
        />
        <Stat
          label="3y mark"
          value={formatMoney(snapshot.predicted_value_3y, asset.currency)}
          hint={`${result.predicted_delta_pct.y3 > 0 ? "+" : ""}${result.predicted_delta_pct.y3}%`}
          hintClass={plClass(result.predicted_delta_pct.y3)}
        />
        <Stat
          label="5y mark"
          value={formatMoney(snapshot.predicted_value_5y, asset.currency)}
          hint={`${result.predicted_delta_pct.y5 > 0 ? "+" : ""}${result.predicted_delta_pct.y5}%`}
          hintClass={plClass(result.predicted_delta_pct.y5)}
        />
      </section>

      <section className="mb-8 rounded-xl border border-surface-border bg-surface-raised p-5">
        <h2 className="mb-3 font-semibold">Narrative</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
          {snapshot.narrative}
        </p>
      </section>

      <div className="mb-4 flex gap-2">
        {(["past", "present", "future"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm capitalize ${
              tab === t ? "bg-accent text-white" : "bg-surface-border text-gray-400"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "past" && (
        <section className="mb-8 rounded-xl border border-surface-border bg-surface-raised p-5">
          <h2 className="mb-3 font-semibold">Past</h2>
          {events.length === 0 ? (
            <p className="text-sm text-gray-500">No historical marks yet. Add a valuation to seed the past.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {events.map((e, i) => (
                <li key={i} className="flex justify-between border-b border-surface-border/40 pb-2">
                  <span className="text-gray-400">
                    {e.at ? new Date(String(e.at)).toLocaleDateString() : "—"} · {String(e.label)}
                  </span>
                  <span className="font-mono">{formatMoney(e.value as number, asset.currency)}</span>
                </li>
              ))}
            </ul>
          )}
          {asset.notes && <p className="mt-4 text-sm text-gray-400">{asset.notes}</p>}
        </section>
      )}

      {tab === "present" && (
        <section className="mb-8 rounded-xl border border-surface-border bg-surface-raised p-5">
          <h2 className="mb-3 font-semibold">Present</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Row label="Occupancy" value={String(present.occupancy ?? re?.occupancy ?? "—")} />
            <Row label="Gross yield" value={result.yield_pct != null ? `${result.yield_pct}%` : "—"} />
            <Row label="Location momentum" value={String(present.location_momentum ?? re?.location_momentum ?? "—")} />
            <Row label="Condition" value={String(present.condition_score ?? re?.condition_score ?? "—")} />
            <Row label="Monthly rent" value={formatMoney(re?.monthly_rent, asset.currency)} />
            <Row label="Annual taxes" value={formatMoney(re?.annual_taxes, asset.currency)} />
            <Row label="Type" value={re?.property_type ?? "—"} />
            <Row label="Status" value={asset.status} />
          </dl>
          {re?.market_notes && <p className="mt-4 text-sm text-gray-400">{re.market_notes}</p>}
        </section>
      )}

      {tab === "future" && (
        <section className="mb-8 rounded-xl border border-surface-border bg-surface-raised p-5">
          <h2 className="mb-3 font-semibold">Future</h2>
          <p className="mb-4 text-sm text-gray-400">
            Predicted marks use the Domzop Formula path (location, yield, risk, and related
            projects). This is an internal model, not a market quote.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="1 year" value={formatMoney(result.predicted_value.y1, asset.currency)} hint={`${result.predicted_delta_pct.y1}%`} />
            <Stat label="3 years" value={formatMoney(result.predicted_value.y3, asset.currency)} hint={`${result.predicted_delta_pct.y3}%`} />
            <Stat label="5 years" value={formatMoney(result.predicted_value.y5, asset.currency)} hint={`${result.predicted_delta_pct.y5}%`} />
          </div>
        </section>
      )}

      <section className="mb-8 rounded-xl border border-surface-border bg-surface-raised p-5">
        <h2 className="mb-1 font-semibold">Projects that may lift / pressure this property</h2>
        <p className="mb-4 text-xs text-gray-500">
          Side projects, infrastructure, supply, policy, and amenities enter the formula as
          signed catalysts.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm text-emerald-400">May lift value</h3>
            {lift.length === 0 && <p className="text-sm text-gray-500">None yet.</p>}
            {lift.map((c) => (
              <CatalystRow key={c.id} c={c} onRemove={() => removeCatalyst(c.id)} />
            ))}
          </div>
          <div>
            <h3 className="mb-2 text-sm text-rose-400">May pressure value</h3>
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
            onChange={(e) => setCat({ ...cat, impact_direction: e.target.value as CatalystDirection })}
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
          className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm hover:bg-emerald-500 disabled:opacity-50"
        >
          Add related project
        </button>
      </section>

      <section className="mb-8 rounded-xl border border-surface-border bg-surface-raised p-5">
        <h2 className="mb-1 font-semibold">Formula breakdown</h2>
        <p className="mb-4 text-xs text-gray-500">
          Factor names and direction only. Mix weights stay internal to {snapshot.formula_version}.
        </p>
        <div className="space-y-3">
          {factors.map((f) => (
            <div key={f.key}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{f.label}</span>
                <span
                  className={
                    f.direction === "tailwind"
                      ? "text-emerald-400"
                      : f.direction === "headwind"
                        ? "text-rose-400"
                        : "text-gray-400"
                  }
                >
                  {f.direction}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-border">
                <div
                  className={
                    f.direction === "tailwind"
                      ? "h-full bg-emerald-500"
                      : f.direction === "headwind"
                        ? "h-full bg-rose-500"
                        : "h-full bg-accent"
                  }
                  style={{ width: `${Math.min(100, Math.max(0, f.score))}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">{f.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-surface-border bg-surface-raised p-5">
        <h2 className="mb-4 font-semibold">Add a valuation mark</h2>
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
          className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm hover:bg-accent/80 disabled:opacity-50"
        >
          Record mark
        </button>
        {valuations.length > 0 && (
          <p className="mt-3 text-xs text-gray-500">{valuations.length} mark(s) on file.</p>
        )}
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  hint,
  hintClass,
}: {
  label: string;
  value: string;
  hint?: string;
  hintClass?: string;
}) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      {hint && <p className={`text-xs ${hintClass ?? "text-gray-500"}`}>{hint}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="capitalize text-gray-200">{value}</dd>
    </div>
  );
}

function CatalystRow({ c, onRemove }: { c: PropertyCatalyst; onRemove: () => void }) {
  return (
    <div className="mb-2 rounded-lg border border-surface-border/80 p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{c.name}</p>
          <p className="text-xs capitalize text-gray-500">
            {c.category.replace("_", " ")} · {c.status} · {c.horizon} · confidence {c.confidence}
          </p>
          {c.description && <p className="mt-1 text-xs text-gray-400">{c.description}</p>}
        </div>
        <button onClick={onRemove} className="text-xs text-gray-500 hover:text-rose-400">
          Remove
        </button>
      </div>
    </div>
  );
}
