"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChartCard,
  DensityPathChart,
  FactorMatrix,
  ImpactTree,
  MetricPills,
} from "@/components/charts";
import { formatMoney, plClass } from "@/lib/money";
import type { DeepDomainIntelligence, DeepPropertyIntelligence, NewsCategory } from "@/lib/deep-types";

type Mode = "property" | "domain";

const NEWS_FILTERS: Array<NewsCategory | "all"> = [
  "all",
  "area",
  "property",
  "builder",
  "proprietor",
  "policy",
  "geopolitics",
  "market",
  "infrastructure",
  "environment",
];

export function AxDialog({
  open,
  onClose,
  mode,
  title,
  propertyDeep,
  domainDeep,
  initialSection,
}: {
  open: boolean;
  onClose: () => void;
  mode: Mode;
  title: string;
  propertyDeep?: DeepPropertyIntelligence | null;
  domainDeep?: DeepDomainIntelligence | null;
  initialSection?: string;
}) {
  const [section, setSection] = useState(initialSection ?? "overview");
  const [newsFilter, setNewsFilter] = useState<NewsCategory | "all">("all");

  useEffect(() => {
    if (open) setSection(initialSection ?? "overview");
  }, [open, initialSection]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const sections =
    mode === "property"
      ? [
          { key: "overview", label: "Overview" },
          { key: "news", label: "News aggregator" },
          { key: "rates", label: "Rate history" },
          { key: "projections", label: "Projections" },
          { key: "formula", label: "Formula" },
          { key: "projects", label: "Related projects" },
          { key: "stakeholders", label: "Builder / proprietor" },
          { key: "policy", label: "Policy & geopolitics" },
          { key: "comps", label: "Comps" },
        ]
      : [
          { key: "overview", label: "Overview" },
          { key: "news", label: "News" },
          { key: "formula", label: "Formula" },
          { key: "competitors", label: "Competitors" },
          { key: "projections", label: "Projections" },
        ];

  const news = useMemo(() => {
    const list = mode === "property" ? propertyDeep?.news ?? [] : domainDeep?.news ?? [];
    if (newsFilter === "all") return list;
    return list.filter((n) => n.category === newsFilter);
  }, [mode, propertyDeep, domainDeep, newsFilter]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-neon-cyan/30 bg-[#070b12] shadow-neon">
        <header className="flex items-start justify-between gap-4 border-b border-surface-border px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neon-gold">
              Ax Panel · Deep drill-down
            </p>
            <h2 className="mt-1 text-xl font-bold">{title}</h2>
            <p className="mt-1 text-xs text-gray-500">
              News · rates · formula projections · related projects · policy / geopolitics
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-surface-border px-3 py-1.5 text-sm text-gray-300 hover:text-white"
          >
            Close
          </button>
        </header>

        <div className="flex flex-wrap gap-1 border-b border-surface-border px-4 py-2">
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className={`rounded-md px-3 py-1.5 text-xs ${
                section === s.key
                  ? "bg-neon-cyan/20 text-neon-cyan"
                  : "text-gray-500 hover:text-gray-200"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {mode === "property" && propertyDeep && (
            <PropertyDeepBody
              deep={propertyDeep}
              section={section}
              news={news}
              newsFilter={newsFilter}
              setNewsFilter={setNewsFilter}
            />
          )}
          {mode === "domain" && domainDeep && (
            <DomainDeepBody deep={domainDeep} section={section} news={news} />
          )}
        </div>
      </div>
    </div>
  );
}

function PropertyDeepBody({
  deep,
  section,
  news,
  newsFilter,
  setNewsFilter,
}: {
  deep: DeepPropertyIntelligence;
  section: string;
  news: DeepPropertyIntelligence["news"];
  newsFilter: NewsCategory | "all";
  setNewsFilter: (v: NewsCategory | "all") => void;
}) {
  const ratePoints = deep.rate_history
    .filter((_, i) => i % 2 === 0)
    .map((h) => ({
      label: h.date.slice(2, 7),
      value: h.median_sale,
    }));

  const lift = deep.related_projects.filter((p) => p.impact_direction === "positive").length;
  const pressure = deep.related_projects.filter((p) => p.impact_direction === "negative").length;

  if (section === "overview") {
    return (
      <div className="space-y-4">
        <ChartCard index={1} title={deep.headline} accent="gold">
          <p className="text-sm leading-relaxed text-gray-300">{deep.thesis}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-neon-green/30 bg-neon-green/5 p-3 text-sm">
              <p className="text-xs uppercase text-neon-green">Opportunity</p>
              <p className="mt-1 text-gray-300">{deep.opportunity_summary}</p>
            </div>
            <div className="rounded-xl border border-neon-red/30 bg-neon-red/5 p-3 text-sm">
              <p className="text-xs uppercase text-neon-red">Risk</p>
              <p className="mt-1 text-gray-300">{deep.risk_summary}</p>
            </div>
          </div>
        </ChartCard>
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard index={2} title="Rate path (24m)" accent="cyan">
            <DensityPathChart points={ratePoints} height={130} formatValue={(v) => formatMoney(v)} />
          </ChartCard>
          <ChartCard index={3} title="Impact tree" accent="pink">
            <ImpactTree liftCount={lift} pressureCount={pressure} />
          </ChartCard>
        </div>
      </div>
    );
  }

  if (section === "news") {
    return (
      <div>
        <div className="mb-4 flex flex-wrap gap-1">
          {NEWS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setNewsFilter(f)}
              className={`rounded-full px-3 py-1 text-[11px] capitalize ${
                newsFilter === f
                  ? "bg-neon-cyan/20 text-neon-cyan"
                  : "border border-surface-border text-gray-500"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {news.map((n) => (
            <article
              key={n.id}
              className="rounded-xl border border-surface-border bg-black/30 p-4"
            >
              <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide">
                <span className="text-neon-gold">{n.category}</span>
                <span
                  className={
                    n.sentiment === "positive"
                      ? "text-neon-green"
                      : n.sentiment === "negative"
                        ? "text-neon-red"
                        : "text-neon-gold"
                  }
                >
                  {n.sentiment} · impact {n.impact_score > 0 ? "+" : ""}
                  {n.impact_score}
                </span>
                <span className="text-gray-600">{n.source}</span>
                <span className="text-gray-600">
                  {new Date(n.published_at).toLocaleDateString()}
                </span>
              </div>
              <h3 className="mt-2 font-semibold">{n.title}</h3>
              <p className="mt-1 text-sm text-gray-400">{n.summary}</p>
              <p className="mt-2 text-xs text-neon-cyan">Why it matters: {n.why_it_matters}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {n.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-surface-border px-2 py-0.5 text-[10px] text-gray-500"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  }

  if (section === "rates") {
    return (
      <div className="space-y-4">
        <ChartCard index={1} title="Property rates history" accent="cyan" caption="Composite median sale + PSF for the submarket.">
          <DensityPathChart points={ratePoints} height={160} />
        </ChartCard>
        <div className="overflow-x-auto rounded-xl border border-surface-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/40 text-gray-500">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Median</th>
                <th className="px-3 py-2">PSF</th>
                <th className="px-3 py-2">Rent PSF</th>
                <th className="px-3 py-2">DOM</th>
                <th className="px-3 py-2">Inventory</th>
              </tr>
            </thead>
            <tbody>
              {deep.rate_history
                .slice()
                .reverse()
                .slice(0, 12)
                .map((h) => (
                  <tr key={h.date} className="border-t border-surface-border/50">
                    <td className="px-3 py-2">{h.date}</td>
                    <td className="px-3 py-2 font-mono">{formatMoney(h.median_sale)}</td>
                    <td className="px-3 py-2">${h.price_psf}</td>
                    <td className="px-3 py-2">{h.rent_psf ?? "—"}</td>
                    <td className="px-3 py-2">{h.days_on_market ?? "—"}</td>
                    <td className="px-3 py-2">{h.inventory ?? "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (section === "projections") {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {deep.projections.map((p) => (
          <ChartCard
            key={p.key}
            index={p.key === "bear" ? 1 : p.key === "base" ? 2 : 3}
            title={p.label}
            accent={p.key === "bull" ? "green" : p.key === "bear" ? "red" : "gold"}
          >
            <MetricPills
              items={[
                { label: "1Y", value: formatMoney(p.y1), tone: "info" },
                { label: "3Y", value: formatMoney(p.y3), tone: "info" },
                { label: "5Y", value: formatMoney(p.y5), tone: "info" },
                { label: "P", value: `${p.probability}%`, tone: "warn" },
              ]}
            />
            <ul className="mt-3 space-y-1 text-xs text-gray-400">
              {p.drivers.map((d) => (
                <li key={d}>• {d}</li>
              ))}
            </ul>
          </ChartCard>
        ))}
      </div>
    );
  }

  if (section === "formula") {
    return (
      <ChartCard
        index={1}
        title={`Domzop Formula · ${deep.formula_version}`}
        accent="pink"
        caption="Step weights shown for transparency; production mix stays versioned."
      >
        <FactorMatrix
          factors={deep.formula_steps.map((s) => ({
            key: s.name,
            label: s.name,
            score: Math.min(100, Math.round(s.contribution * 2.5)),
            direction: s.direction,
            note: `${s.detail} · weight ${(s.weight * 100).toFixed(0)}% · input: ${s.input}`,
          }))}
        />
      </ChartCard>
    );
  }

  if (section === "projects") {
    return (
      <div className="space-y-3">
        {deep.related_projects.map((p) => (
          <div key={p.id} className="rounded-xl border border-surface-border bg-black/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{p.name}</h3>
              <span
                className={
                  p.impact_direction === "positive" ? "text-neon-green" : "text-neon-red"
                }
              >
                {p.impact_direction} · weight {p.impact_weight} · conf {p.confidence}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-400">{p.description}</p>
            <p className="mt-2 text-xs text-neon-cyan">Mechanism: {p.value_mechanism}</p>
            <p className="mt-1 text-xs text-gray-500">
              {p.category} · {p.status} · {p.horizon}
              {p.distance_km != null ? ` · ${p.distance_km} km` : ""} · {p.timeline}
            </p>
          </div>
        ))}
      </div>
    );
  }

  if (section === "stakeholders") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {deep.stakeholders.map((s) => (
          <div key={s.name} className="rounded-xl border border-surface-border bg-black/30 p-4">
            <p className="text-[10px] uppercase tracking-wide text-neon-gold">{s.role}</p>
            <h3 className="mt-1 font-semibold">{s.name}</h3>
            <p className="mt-1 text-xs text-gray-400">Reputation {s.reputation}/100</p>
            <p className="mt-2 text-sm text-gray-300">{s.track_record}</p>
            <p className="mt-2 text-xs text-neon-cyan">{s.recent_activity}</p>
            {s.risk_flags.length > 0 && (
              <p className="mt-2 text-xs text-neon-red">Flags: {s.risk_flags.join(" · ")}</p>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (section === "policy") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard index={1} title="Government policy watch" accent="gold">
          <ul className="space-y-3">
            {deep.policy_watch.map((p) => (
              <li key={p.title} className="text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{p.title}</span>
                  <span className="text-xs capitalize text-gray-500">
                    {p.status} · {p.impact}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-400">{p.note}</p>
              </li>
            ))}
          </ul>
        </ChartCard>
        <ChartCard index={2} title="Geopolitics impact" accent="orange">
          <ul className="space-y-3">
            {deep.geopolitics.map((g) => (
              <li key={g.title} className="text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{g.title}</span>
                  <span className={plClass(g.impact === "positive" ? 1 : -1)}>
                    {g.impact} · sev {g.severity}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-400">{g.note}</p>
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>
    );
  }

  if (section === "comps") {
    return (
      <div className="overflow-x-auto rounded-xl border border-surface-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/40 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Comp</th>
              <th className="px-4 py-3">Distance</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">PSF</th>
              <th className="px-4 py-3">Sold</th>
            </tr>
          </thead>
          <tbody>
            {deep.comps.map((c) => (
              <tr key={c.name} className="border-t border-surface-border/50">
                <td className="px-4 py-3">{c.name}</td>
                <td className="px-4 py-3">{c.distance_km} km</td>
                <td className="px-4 py-3 font-mono">{formatMoney(c.price)}</td>
                <td className="px-4 py-3">${c.price_psf}</td>
                <td className="px-4 py-3 text-gray-400">{c.sold_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return null;
}

function DomainDeepBody({
  deep,
  section,
  news,
}: {
  deep: DeepDomainIntelligence;
  section: string;
  news: DeepDomainIntelligence["news"];
}) {
  if (section === "overview") {
    return (
      <ChartCard index={1} title={deep.headline} accent="cyan">
        <p className="text-sm text-gray-300">{deep.thesis}</p>
        <MetricPills
          items={[
            { label: "SCORE", value: String(deep.opportunity_score), tone: "ok" },
            { label: "BRAND", value: String(deep.brandability), tone: "info" },
            { label: "CAT", value: deep.category, tone: "warn" },
          ]}
        />
        <div className="mt-4 flex flex-wrap gap-1">
          {deep.keywords.map((k) => (
            <span
              key={k}
              className="rounded-full border border-neon-cyan/30 px-2 py-0.5 text-[11px] text-neon-cyan"
            >
              {k}
            </span>
          ))}
        </div>
        <p className="mt-4 text-xs text-gray-500">{deep.availability_notes}</p>
        <p className="mt-2 text-xs text-neon-red">Risks: {deep.risk_flags.join(" · ")}</p>
      </ChartCard>
    );
  }

  if (section === "news") {
    return (
      <div className="space-y-3">
        {news.map((n) => (
          <article key={n.id} className="rounded-xl border border-surface-border p-4">
            <p className="text-[10px] uppercase text-neon-gold">
              {n.category} · {n.sentiment}
            </p>
            <h3 className="mt-1 font-semibold">{n.title}</h3>
            <p className="mt-1 text-sm text-gray-400">{n.summary}</p>
            <p className="mt-2 text-xs text-neon-cyan">{n.why_it_matters}</p>
          </article>
        ))}
      </div>
    );
  }

  if (section === "formula") {
    return (
      <FactorMatrix
        factors={deep.formula_steps.map((s) => ({
          key: s.name,
          label: s.name,
          score: Math.min(100, Math.round(s.contribution * 2.5)),
          direction: s.direction,
          note: s.detail,
        }))}
      />
    );
  }

  if (section === "competitors") {
    return (
      <div className="space-y-3">
        {deep.competitors.map((c) => (
          <div
            key={c.domain}
            className="flex items-center justify-between rounded-xl border border-surface-border px-4 py-3"
          >
            <div>
              <p className="font-medium">{c.domain}</p>
              <p className="text-xs text-gray-500">{c.note}</p>
            </div>
            <p className="text-neon-cyan">{c.strength}</p>
          </div>
        ))}
        <ChartCard index={1} title="Traffic proxy" accent="purple">
          <DensityPathChart
            points={deep.traffic_proxy.map((t) => ({ label: t.month, value: t.score }))}
            height={120}
            color="#c084fc"
          />
        </ChartCard>
      </div>
    );
  }

  if (section === "projections") {
    return (
      <div className="space-y-3">
        {deep.projections.map((p) => (
          <div key={p.horizon} className="rounded-xl border border-surface-border p-4">
            <div className="flex justify-between">
              <h3 className="font-semibold">{p.horizon}</h3>
              <span className="text-neon-cyan">{p.score}</span>
            </div>
            <p className="mt-2 text-sm text-gray-400">{p.narrative}</p>
          </div>
        ))}
      </div>
    );
  }

  return null;
}
