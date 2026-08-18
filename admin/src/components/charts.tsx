import type { ReactNode } from "react";

const ACCENT: Record<string, string> = {
  cyan: "var(--neon-cyan)",
  blue: "var(--neon-blue)",
  green: "var(--neon-green)",
  lime: "var(--neon-lime)",
  purple: "var(--neon-purple)",
  pink: "var(--neon-pink)",
  orange: "var(--neon-orange)",
  gold: "var(--neon-gold)",
  red: "var(--neon-red)",
};

export function ChartCard({
  index,
  title,
  caption,
  accent = "gold",
  children,
  className = "",
}: {
  index?: number | string;
  title: string;
  caption?: string;
  accent?: keyof typeof ACCENT;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`chart-panel neon-grid ${className}`}>
      <div className="mb-4 flex items-baseline gap-2">
        {index != null && (
          <span className="text-xs font-bold tabular-nums" style={{ color: ACCENT[accent] }}>
            {typeof index === "number" ? `${index}.` : index}
          </span>
        )}
        <h3 className="chart-title" style={{ color: ACCENT[accent] }}>
          {title}
        </h3>
      </div>
      {children}
      {caption && <p className="chart-caption">{caption}</p>}
    </div>
  );
}

/** Hash-lookup style: one lit cell among a row — for intelligence score. */
export function HashLookupScore({
  score,
  label = "Intelligence",
  cells = 9,
  compact = false,
}: {
  score: number | null;
  label?: string;
  cells?: number;
  compact?: boolean;
}) {
  const lit =
    score == null
      ? -1
      : Math.min(cells - 1, Math.max(0, Math.round((score / 100) * (cells - 1))));
  const cell = compact ? "h-4 w-4" : "h-8 w-8";
  return (
    <div className={`flex flex-col items-center ${compact ? "gap-1.5" : "gap-3"}`}>
      <div className={`flex ${compact ? "gap-1" : "gap-1.5"}`}>
        {Array.from({ length: cells }).map((_, i) => (
          <div
            key={i}
            className={`${cell} rounded-md border transition`}
            style={
              i === lit
                ? {
                    background: "var(--neon-green)",
                    borderColor: "var(--neon-green)",
                    boxShadow: "0 0 16px rgba(52, 211, 153, 0.55)",
                  }
                : {
                    borderColor: "rgba(52, 211, 153, 0.35)",
                    background: "transparent",
                  }
            }
          />
        ))}
      </div>
      <div className="text-center">
        <p
          className={`font-bold tabular-nums text-neon-green ${compact ? "text-xl" : "text-3xl"}`}
        >
          {score == null ? "—" : Math.round(score)}
        </p>
        <p className="text-[10px] uppercase tracking-widest text-gray-500">{label}</p>
      </div>
    </div>
  );
}

/** Halving bars — O(log n) narrowing for forecast confidence. */
export function HalvingBars({
  levels = [100, 55, 30, 16, 9],
  color = "var(--neon-purple)",
}: {
  levels?: number[];
  color?: string;
}) {
  return (
    <div className="flex h-16 items-end gap-1">
      {levels.map((w, i) => (
        <div
          key={i}
          className="rounded-sm"
          style={{
            width: `${Math.max(8, w)}%`,
            height: `${40 + i * 12}%`,
            background: color,
            opacity: 1 - i * 0.12,
            boxShadow: `0 0 10px ${color}55`,
          }}
        />
      ))}
    </div>
  );
}

export type SeriesPoint = { label: string; value: number; future?: boolean };

/** Density / chromatography style line+area for past→future path. */
export function DensityPathChart({
  points,
  color = "#22d3ee",
  height = 140,
}: {
  points: SeriesPoint[];
  color?: string;
  height?: number;
}) {
  if (points.length < 2) {
    return <p className="text-xs text-gray-500">Need at least two marks to draw a path.</p>;
  }
  const w = 320;
  const h = height;
  const pad = 16;
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals) * 0.92;
  const max = Math.max(...vals) * 1.08 || 1;
  const xs = points.map((_, i) => pad + (i * (w - pad * 2)) / (points.length - 1));
  const ys = vals.map((v) => pad + ((max - v) / (max - min || 1)) * (h - pad * 2));
  const line = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");
  const area = `${line} L${xs[xs.length - 1]},${h - pad} L${xs[0]},${h - pad} Z`;
  const split = points.findIndex((p) => p.future);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img">
      {[0.25, 0.5, 0.75].map((t) => (
        <line
          key={t}
          x1={pad}
          x2={w - pad}
          y1={pad + t * (h - pad * 2)}
          y2={pad + t * (h - pad * 2)}
          stroke="rgba(56,189,248,0.12)"
          strokeDasharray="3 4"
        />
      ))}
      <path d={area} fill={color} opacity={0.12} />
      <path d={line} fill="none" stroke={color} strokeWidth={2.2} />
      {split > 0 && (
        <line
          x1={xs[split]}
          x2={xs[split]}
          y1={pad}
          y2={h - pad}
          stroke="var(--neon-gold)"
          strokeDasharray="4 3"
          opacity={0.7}
        />
      )}
      {xs.map((x, i) => (
        <g key={i}>
          <circle
            cx={x}
            cy={ys[i]}
            r={points[i].future ? 4.5 : 3.5}
            fill={points[i].future ? "var(--neon-gold)" : color}
            stroke="#05070c"
            strokeWidth={1.5}
          />
          <text
            x={x}
            y={h - 2}
            textAnchor="middle"
            fill="#6b7c93"
            fontSize={9}
          >
            {points[i].label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** Donut composition — base composition / allocation. */
export function CompositionDonut({
  slices,
  size = 148,
}: {
  slices: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const r = 54;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg width={size} height={size} viewBox="0 0 140 140">
        <circle cx={70} cy={70} r={r} fill="none" stroke="rgba(30,42,60,0.9)" strokeWidth={16} />
        {slices.map((slice) => {
          const len = (slice.value / total) * c;
          const el = (
            <circle
              key={slice.label}
              cx={70}
              cy={70}
              r={r}
              fill="none"
              stroke={slice.color}
              strokeWidth={16}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform="rotate(-90 70 70)"
              style={{ filter: `drop-shadow(0 0 6px ${slice.color}88)` }}
            />
          );
          offset += len;
          return el;
        })}
        <text x={70} y={66} textAnchor="middle" fill="#9fb0c5" fontSize={10}>
          BOOK
        </text>
        <text x={70} y={82} textAnchor="middle" fill="#e8eef7" fontSize={14} fontWeight={700}>
          {Math.round(total) === 0 ? "—" : "100%"}
        </text>
      </svg>
      <ul className="space-y-2 text-sm">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-gray-300">{s.label}</span>
            <span className="tabular-nums text-gray-500">
              {total ? Math.round((s.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Node-link network for related projects / catalysts. */
export function CatalystNetwork({
  centerLabel,
  nodes,
}: {
  centerLabel: string;
  nodes: { id: string; label: string; positive: boolean }[];
}) {
  const w = 360;
  const h = 200;
  const cx = w / 2;
  const cy = h / 2;
  const ring = Math.min(nodes.length, 8);
  const shown = nodes.slice(0, ring);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full">
      {shown.map((n, i) => {
        const angle = (i / shown.length) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * 78;
        const y = cy + Math.sin(angle) * 58;
        const color = n.positive ? "var(--neon-green)" : "var(--neon-red)";
        return (
          <g key={n.id}>
            <line
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke={color}
              strokeWidth={1.5}
              opacity={0.55}
            />
            <circle cx={x} cy={y} r={7} fill={color} style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
            <text
              x={x}
              y={y + 18}
              textAnchor="middle"
              fill="#9fb0c5"
              fontSize={9}
            >
              {n.label.length > 14 ? `${n.label.slice(0, 12)}…` : n.label}
            </text>
          </g>
        );
      })}
      <circle
        cx={cx}
        cy={cy}
        r={22}
        fill="#0b1018"
        stroke="var(--neon-cyan)"
        strokeWidth={2}
        style={{ filter: "drop-shadow(0 0 10px rgba(34,211,238,0.45))" }}
      />
      <text x={cx} y={cy + 4} textAnchor="middle" fill="#e8eef7" fontSize={9} fontWeight={600}>
        {centerLabel.length > 10 ? `${centerLabel.slice(0, 9)}…` : centerLabel}
      </text>
      {nodes.length === 0 && (
        <text x={cx} y={cy + 48} textAnchor="middle" fill="#6b7c93" fontSize={11}>
          Add related projects to map impact
        </text>
      )}
    </svg>
  );
}

/** Past → Present → Future sequence bar (protocol workflow style). */
export function TimelineSequence({
  active,
  onSelect,
}: {
  active: "past" | "present" | "future";
  onSelect: (t: "past" | "present" | "future") => void;
}) {
  const steps = [
    { key: "past" as const, color: "var(--neon-purple)", label: "Past" },
    { key: "present" as const, color: "var(--neon-cyan)", label: "Present" },
    { key: "future" as const, color: "var(--neon-gold)", label: "Future" },
  ];
  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelect(s.key)}
            className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition"
            style={{
              borderColor: s.color,
              color: active === s.key ? "#05070c" : s.color,
              background: active === s.key ? s.color : "transparent",
              boxShadow: active === s.key ? `0 0 14px ${s.color}66` : undefined,
            }}
          >
            <span className="tabular-nums opacity-70">{i + 1}</span>
            {s.label}
          </button>
          {i < steps.length - 1 && (
            <div className="h-px w-6 bg-gradient-to-r from-neon-purple/50 to-neon-cyan/50" />
          )}
        </div>
      ))}
    </div>
  );
}

/** Nested-loop / matrix style factor scores. */
export function FactorMatrix({
  factors,
}: {
  factors: { key: string; label: string; score: number; direction: string; note: string }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {factors.map((f, i) => {
        const color =
          f.direction === "tailwind"
            ? "var(--neon-green)"
            : f.direction === "headwind"
              ? "var(--neon-red)"
              : "var(--neon-blue)";
        return (
          <div
            key={f.key}
            className="rounded-xl border border-surface-border/80 bg-black/30 p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-bold" style={{ color: "var(--neon-gold)" }}>
                {i + 1}. {f.label}
              </span>
              <span className="text-[10px] uppercase" style={{ color }}>
                {f.direction}
              </span>
            </div>
            <div className="mb-2 grid grid-cols-10 gap-0.5">
              {Array.from({ length: 10 }).map((_, cell) => {
                const on = cell < Math.round(f.score / 10);
                return (
                  <div
                    key={cell}
                    className="aspect-square rounded-[2px]"
                    style={{
                      background: on ? color : "transparent",
                      border: `1px solid ${color}55`,
                      opacity: on ? 0.9 : 0.35,
                    }}
                  />
                );
              })}
            </div>
            <p className="text-[11px] leading-snug text-gray-500">{f.note}</p>
          </div>
        );
      })}
    </div>
  );
}

/** Numbered workflow strip (in-silico style). */
export function IntelligenceWorkflow() {
  const steps = [
    { n: 1, t: "Ingest", c: "var(--neon-cyan)" },
    { n: 2, t: "Mark", c: "var(--neon-blue)" },
    { n: 3, t: "Catalysts", c: "var(--neon-purple)" },
    { n: 4, t: "Formula", c: "var(--neon-orange)" },
    { n: 5, t: "Outlook", c: "var(--neon-green)" },
  ];
  return (
    <ol className="flex flex-wrap gap-3">
      {steps.map((s) => (
        <li
          key={s.n}
          className="flex min-w-[88px] flex-col rounded-lg border px-3 py-2"
          style={{ borderColor: `${s.c}66` }}
        >
          <span className="text-lg font-bold tabular-nums" style={{ color: s.c }}>
            {s.n}
          </span>
          <span className="text-[11px] uppercase tracking-wide text-gray-400">{s.t}</span>
        </li>
      ))}
    </ol>
  );
}

/** Branching tree for lift vs pressure scenarios. */
export function ImpactTree({
  liftCount,
  pressureCount,
}: {
  liftCount: number;
  pressureCount: number;
}) {
  return (
    <svg viewBox="0 0 280 120" className="mx-auto h-28 w-full max-w-xs">
      <circle cx={140} cy={20} r={8} fill="var(--neon-cyan)" />
      <line x1={140} y1={28} x2={80} y2={60} stroke="var(--neon-green)" strokeWidth={2} />
      <line x1={140} y1={28} x2={200} y2={60} stroke="var(--neon-red)" strokeWidth={2} />
      <circle cx={80} cy={68} r={7} fill="var(--neon-green)" />
      <circle cx={200} cy={68} r={7} fill="var(--neon-red)" />
      <line x1={80} y1={75} x2={50} y2={100} stroke="var(--neon-green)" strokeWidth={1.5} opacity={0.7} />
      <line x1={80} y1={75} x2={110} y2={100} stroke="var(--neon-green)" strokeWidth={1.5} opacity={0.7} />
      <line x1={200} y1={75} x2={170} y2={100} stroke="var(--neon-red)" strokeWidth={1.5} opacity={0.7} />
      <line x1={200} y1={75} x2={230} y2={100} stroke="var(--neon-red)" strokeWidth={1.5} opacity={0.7} />
      <text x={80} y={118} textAnchor="middle" fill="var(--neon-green)" fontSize={11}>
        Lift · {liftCount}
      </text>
      <text x={200} y={118} textAnchor="middle" fill="var(--neon-red)" fontSize={11}>
        Pressure · {pressureCount}
      </text>
    </svg>
  );
}

/** Horizontal metric pills like protocol status chips. */
export function MetricPills({
  items,
}: {
  items: { label: string; value: string; tone?: "ok" | "warn" | "bad" | "info" }[];
}) {
  const toneColor = {
    ok: "var(--neon-green)",
    warn: "var(--neon-gold)",
    bad: "var(--neon-red)",
    info: "var(--neon-blue)",
  };
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-md border px-2.5 py-1 text-xs"
          style={{
            borderColor: `${toneColor[item.tone ?? "info"]}66`,
            color: toneColor[item.tone ?? "info"],
          }}
        >
          <span className="mr-1.5 opacity-70">{item.label}</span>
          <span className="font-semibold text-gray-100">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
