"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

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
        <p className={`font-bold tabular-nums text-neon-green ${compact ? "text-xl" : "text-3xl"}`}>
          {score == null ? "—" : Math.round(score)}
        </p>
        <p className="text-[10px] uppercase tracking-widest text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export function HalvingBars({
  levels = [100, 55, 30, 16, 9],
  color = "var(--neon-purple)",
}: {
  levels?: number[];
  color?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <div className="flex h-16 items-end gap-1">
      {levels.map((w, i) => (
        <motion.div
          key={i}
          className="rounded-sm"
          initial={reduce ? false : { scaleX: 0.2, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 - i * 0.12 }}
          transition={{ type: "spring", stiffness: 260, damping: 22, delay: i * 0.05 }}
          style={{
            width: `${Math.max(8, w)}%`,
            height: `${40 + i * 12}%`,
            background: color,
            boxShadow: `0 0 10px ${color}55`,
            transformOrigin: "left center",
          }}
        />
      ))}
    </div>
  );
}

export type SeriesPoint = { label: string; value: number; future?: boolean };

export type ChartPointEvent = {
  index: number;
  label: string;
  value: number;
  future?: boolean;
};

/** Interactive density path with tooltip, click drill-down, draw-in animation. */
export function DensityPathChart({
  points,
  color = "#22d3ee",
  height = 140,
  onPointClick,
  formatValue,
}: {
  points: SeriesPoint[];
  color?: string;
  height?: number;
  onPointClick?: (point: ChartPointEvent) => void;
  formatValue?: (v: number) => string;
}) {
  const reduce = useReducedMotion();
  const pathId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  const geom = useMemo(() => {
    if (points.length < 2) return null;
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
    const length = xs.reduce((acc, x, i) => {
      if (i === 0) return 0;
      const dx = x - xs[i - 1];
      const dy = ys[i] - ys[i - 1];
      return acc + Math.hypot(dx, dy);
    }, 0);
    return { w, h, pad, xs, ys, line, area, length, split: points.findIndex((p) => p.future) };
  }, [points, height]);

  useEffect(() => {
    setHover(null);
    setSelected(null);
  }, [points]);

  if (!geom || points.length < 2) {
    return <p className="text-xs text-gray-500">Need at least two marks to draw a path.</p>;
  }

  const active = selected ?? hover;
  const tip = active != null ? points[active] : null;
  const fmt = formatValue ?? ((v: number) => v.toLocaleString());

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${geom.w} ${geom.h}`} className="h-auto w-full select-none" role="img">
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1={geom.pad}
            x2={geom.w - geom.pad}
            y1={geom.pad + t * (geom.h - geom.pad * 2)}
            y2={geom.pad + t * (geom.h - geom.pad * 2)}
            stroke="rgba(56,189,248,0.12)"
            strokeDasharray="3 4"
          />
        ))}
        <path d={geom.area} fill={color} opacity={0.12} />
        <motion.path
          d={geom.line}
          fill="none"
          stroke={color}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={
            reduce
              ? false
              : { pathLength: 0, opacity: 0.4 }
          }
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          style={{ pathLength: 1 }}
        />
        {geom.split > 0 && (
          <line
            x1={geom.xs[geom.split]}
            x2={geom.xs[geom.split]}
            y1={geom.pad}
            y2={geom.h - geom.pad}
            stroke="var(--neon-gold)"
            strokeDasharray="4 3"
            opacity={0.7}
          />
        )}
        {geom.xs.map((x, i) => (
          <g key={`${pathId}-${i}`}>
            <circle
              cx={x}
              cy={geom.ys[i]}
              r={18}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => {
                setSelected(i);
                onPointClick?.({
                  index: i,
                  label: points[i].label,
                  value: points[i].value,
                  future: points[i].future,
                });
              }}
            />
            <motion.circle
              cx={x}
              cy={geom.ys[i]}
              r={active === i ? 6 : points[i].future ? 4.5 : 3.5}
              fill={points[i].future ? "var(--neon-gold)" : color}
              stroke="#05070c"
              strokeWidth={1.5}
              initial={reduce ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 20, delay: 0.08 * i }}
              style={{ pointerEvents: "none" }}
            />
            <text x={x} y={geom.h - 2} textAnchor="middle" fill="#6b7c93" fontSize={9}>
              {points[i].label}
            </text>
          </g>
        ))}
      </svg>
      {tip && active != null && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-neon-cyan/40 bg-black/90 px-2.5 py-1.5 text-[11px] shadow-neon"
          style={{
            left: `${(geom.xs[active] / geom.w) * 100}%`,
            top: Math.max(4, geom.ys[active] - 42),
            transform: "translateX(-50%)",
          }}
        >
          <p className="font-semibold text-neon-cyan">{tip.label}</p>
          <p className="tabular-nums text-gray-200">{fmt(tip.value)}</p>
          {onPointClick && <p className="text-[10px] text-gray-500">Click for deep view</p>}
        </div>
      )}
    </div>
  );
}

/** Interactive keyword / factor bars with grow animation + tooltip. */
export function InteractiveBars({
  items,
  onBarClick,
}: {
  items: { label: string; value: number; fullLabel?: string }[];
  onBarClick?: (item: { label: string; value: number; index: number }) => void;
}) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  if (!items.length) {
    return <p className="p-4 text-center text-[11px] text-gray-500">No bars yet</p>;
  }
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="relative flex h-[100px] items-end gap-1.5 px-1 pb-5">
      {items.map((item, i) => (
        <button
          key={`${item.label}-${i}`}
          type="button"
          className="group relative flex flex-1 flex-col items-center justify-end"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
          onClick={() => onBarClick?.({ label: item.fullLabel ?? item.label, value: item.value, index: i })}
        >
          <motion.div
            className="w-full rounded-t bg-neon-blue"
            initial={reduce ? false : { height: 0 }}
            animate={{ height: Math.max(6, (item.value / max) * 70) }}
            transition={{ type: "spring", stiffness: 220, damping: 18, delay: i * 0.04 }}
            style={{
              boxShadow:
                hover === i ? "0 0 14px rgba(56,189,248,0.65)" : "0 0 8px rgba(56,189,248,0.35)",
            }}
          />
          <span className="absolute -bottom-4 text-[8px] uppercase text-gray-500">{item.label}</span>
          {hover === i && (
            <span className="pointer-events-none absolute -top-7 rounded bg-black/90 px-1.5 py-0.5 text-[10px] text-neon-cyan">
              {(item.fullLabel ?? item.label)} · {Math.round(item.value)}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function CompositionDonut({
  slices,
  size = 148,
  onSliceClick,
}: {
  slices: { label: string; value: number; color: string }[];
  size?: number;
  onSliceClick?: (label: string) => void;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const r = 54;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg width={size} height={size} viewBox="0 0 140 140">
        <circle cx={70} cy={70} r={r} fill="none" stroke="rgba(30,42,60,0.9)" strokeWidth={16} />
        {slices.map((slice, i) => {
          const len = (slice.value / total) * c;
          const el = (
            <motion.circle
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
              className={onSliceClick ? "cursor-pointer" : undefined}
              onClick={() => onSliceClick?.(slice.label)}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.08 }}
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
  const shown = nodes.slice(0, 8);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full">
      {shown.map((n, i) => {
        const angle = (i / shown.length) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * 78;
        const y = cy + Math.sin(angle) * 58;
        const color = n.positive ? "var(--neon-green)" : "var(--neon-red)";
        return (
          <g key={n.id}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke={color} strokeWidth={1.5} opacity={0.55} />
            <circle
              cx={x}
              cy={y}
              r={7}
              fill={color}
              style={{ filter: `drop-shadow(0 0 6px ${color})` }}
            />
            <text x={x} y={y + 18} textAnchor="middle" fill="#9fb0c5" fontSize={9}>
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
    </svg>
  );
}

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
            className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition spring-press"
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

export function FactorMatrix({
  factors,
  onFactorClick,
}: {
  factors: { key: string; label: string; score: number; direction: string; note: string }[];
  onFactorClick?: (key: string) => void;
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
          <button
            key={f.key}
            type="button"
            onClick={() => onFactorClick?.(f.key)}
            className="rounded-xl border border-surface-border/80 bg-black/30 p-3 text-left spring-press"
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
          </button>
        );
      })}
    </div>
  );
}

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
      <text x={80} y={118} textAnchor="middle" fill="var(--neon-green)" fontSize={11}>
        Lift · {liftCount}
      </text>
      <text x={200} y={118} textAnchor="middle" fill="var(--neon-red)" fontSize={11}>
        Pressure · {pressureCount}
      </text>
    </svg>
  );
}

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
          className="rounded-md border px-2.5 py-1 text-xs spring-press"
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

/** Hotspots list — % + intensity bar + count (Insights sidebar style). */
export function HotspotRows({
  rows,
  onRowClick,
}: {
  rows: {
    id: string;
    label: string;
    pct: number;
    count?: number | string;
    positive?: boolean;
  }[];
  onRowClick?: (id: string) => void;
}) {
  const reduce = useReducedMotion();
  if (!rows.length) {
    return <p className="text-sm text-gray-500">No hotspots yet.</p>;
  }
  return (
    <div className="space-y-2.5">
      {rows.map((row, i) => (
        <button
          key={row.id}
          type="button"
          onClick={() => onRowClick?.(row.id)}
          className="flex w-full items-center gap-3 text-left text-xs spring-press"
        >
          <span className="w-11 tabular-nums text-neon-cyan">{row.pct.toFixed(1)}%</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-border">
            <motion.div
              className="h-full rounded-full"
              initial={reduce ? false : { width: 0 }}
              animate={{ width: `${Math.min(100, row.pct)}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 22, delay: i * 0.04 }}
              style={{
                background: row.positive === false ? "var(--neon-red)" : "var(--neon-blue)",
              }}
            />
          </div>
          <span className="w-24 truncate text-gray-400">{row.label}</span>
          {row.count != null && (
            <span className="w-8 text-right tabular-nums text-gray-500">{row.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
