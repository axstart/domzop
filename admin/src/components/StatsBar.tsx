"use client";

import { useEffect, useState } from "react";

interface Stats {
  monitoring: number;
  evaluated: number;
  purchased: number;
  discarded: number;
  high_score: number;
  total: number;
}

export function StatsBar() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setStats(d.stats));
  }, []);

  const items = [
    { label: "Monitoring", value: stats?.monitoring, color: "text-blue-400" },
    { label: "Evaluated", value: stats?.evaluated, color: "text-amber-400" },
    { label: "High Score", value: stats?.high_score, color: "text-purple-400" },
    { label: "Total", value: stats?.total, color: "text-gray-300" },
  ];

  return (
    <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map(({ label, value, color }) => (
        <div
          key={label}
          className="rounded-xl border border-surface-border bg-surface-raised px-5 py-4"
        >
          <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
          <p className={`mt-1 text-2xl font-semibold ${color}`}>{value ?? "—"}</p>
        </div>
      ))}
    </div>
  );
}
