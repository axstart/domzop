"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface Candidate {
  id: string;
  project_slug: string;
  platform: string;
  deploy_url: string;
  com_domain: string;
  status: string;
  quality_score: number | null;
  investment_score: number | null;
  poll_count: number;
  first_seen_at: string;
}

const STATUS_FILTERS = ["all", "monitoring", "evaluated", "purchased", "discarded"] as const;

export function CandidateTable() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = filter !== "all" ? `?status=${filter}` : "";
    const res = await fetch(`/api/candidates${qs}`);
    const data = await res.json();
    setCandidates(data.candidates ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  async function action(id: string, action: "purchase" | "discard") {
    await fetch(`/api/candidates/${id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "",
      },
      body: JSON.stringify({ action }),
    });
    load();
  }

  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised">
      <div className="flex flex-wrap items-center gap-2 border-b border-surface-border px-5 py-4">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-sm capitalize transition ${
              filter === s
                ? "bg-accent text-white"
                : "text-gray-400 hover:bg-surface-border hover:text-white"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-surface-border text-xs uppercase text-gray-500">
              <th className="px-5 py-3">Project</th>
              <th className="px-5 py-3">Platform</th>
              <th className="px-5 py-3">.com Target</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Invest</th>
              <th className="px-5 py-3">Quality</th>
              <th className="px-5 py-3">Polls</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-5 py-8 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : candidates.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-8 text-center text-gray-500">
                  No candidates yet. Start the ingestion service to begin monitoring.
                </td>
              </tr>
            ) : (
              candidates.map((c) => (
                <tr key={c.id} className="border-b border-surface-border/50 hover:bg-surface/50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/candidates/${c.id}`}
                      className="font-medium text-accent-muted hover:underline"
                    >
                      {c.project_slug}
                    </Link>
                  </td>
                  <td className="px-5 py-3 capitalize text-gray-400">{c.platform}</td>
                  <td className="px-5 py-3 font-mono text-xs">{c.com_domain}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-5 py-3">
                    {c.investment_score != null ? (
                      <span
                        className={
                          c.investment_score >= 70
                            ? "text-emerald-400"
                            : c.investment_score >= 50
                              ? "text-amber-400"
                              : "text-gray-400"
                        }
                      >
                        {c.investment_score.toFixed(0)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {c.quality_score != null ? c.quality_score.toFixed(0) : "—"}
                  </td>
                  <td className="px-5 py-3 text-gray-400">{c.poll_count}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      {c.status === "evaluated" && (
                        <button
                          onClick={() => action(c.id, "purchase")}
                          className="rounded bg-emerald-600 px-2 py-1 text-xs hover:bg-emerald-500"
                        >
                          Buy
                        </button>
                      )}
                      {["monitoring", "evaluated"].includes(c.status) && (
                        <button
                          onClick={() => action(c.id, "discard")}
                          className="rounded bg-surface-border px-2 py-1 text-xs text-gray-400 hover:text-white"
                        >
                          Discard
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    monitoring: "bg-blue-500/20 text-blue-300",
    evaluated: "bg-amber-500/20 text-amber-300",
    purchased: "bg-emerald-500/20 text-emerald-300",
    discarded: "bg-gray-500/20 text-gray-400",
    discovered: "bg-purple-500/20 text-purple-300",
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs capitalize ${colors[status] ?? ""}`}
    >
      {status}
    </span>
  );
}
