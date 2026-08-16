"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";

export default function CandidateDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch(`/api/candidates/${params.id}/detail`)
      .then((r) => r.json())
      .then(setData);
  }, [params.id]);

  if (!data?.candidate) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-10">
        <Nav />
        <p className="text-gray-500">Loading…</p>
      </main>
    );
  }

  const c = data.candidate as Record<string, unknown>;
  const keywords = (data.keywords as Array<Record<string, unknown>>) ?? [];
  const research = data.research as Record<string, unknown> | null;
  const availability = (data.availability as Array<Record<string, unknown>>) ?? [];
  const polls = (data.polls as Array<Record<string, unknown>>) ?? [];

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <Nav />
      <Link href="/" className="text-sm text-accent-muted hover:underline">
        ← Back to candidates
      </Link>

      <header className="mt-4 mb-8">
        <h1 className="text-3xl font-bold">{String(c.project_slug)}</h1>
        <p className="mt-1 text-gray-400">
          <a href={String(c.deploy_url)} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {String(c.deploy_url)}
          </a>
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-surface-border bg-surface-raised p-5">
          <h2 className="mb-4 font-semibold">Scores</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-400">Investment score</dt>
              <dd className="font-mono">{c.investment_score != null ? String(c.investment_score) : "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Quality score</dt>
              <dd className="font-mono">{c.quality_score != null ? String(c.quality_score) : "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">.com domain</dt>
              <dd className="font-mono">{String(c.com_domain)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">.com available</dt>
              <dd>{c.com_available === true ? "Yes" : c.com_available === false ? "No" : "Unknown"}</dd>
            </div>
          </dl>
          {typeof c.investment_notes === "string" && c.investment_notes && (
            <p className="mt-4 text-xs text-gray-400">{String(c.investment_notes)}</p>
          )}
        </section>

        <section className="rounded-xl border border-surface-border bg-surface-raised p-5">
          <h2 className="mb-4 font-semibold">Research</h2>
          {research ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-400">Category</dt>
                <dd className="capitalize">{String(research.category)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Trend score</dt>
                <dd>{String(research.trend_score)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Competition</dt>
                <dd className="capitalize">{String(research.competition_density)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Brandability</dt>
                <dd>{String(research.brandability_score)}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-gray-500">Research pending…</p>
          )}
        </section>

        <section className="rounded-xl border border-surface-border bg-surface-raised p-5">
          <h2 className="mb-4 font-semibold">Keywords</h2>
          <div className="flex flex-wrap gap-2">
            {keywords.map((k) => (
              <span
                key={String(k.keyword)}
                className="rounded-full bg-surface-border px-3 py-1 text-xs"
                title={`source: ${k.source}, weight: ${k.weight}`}
              >
                {String(k.keyword)}
              </span>
            ))}
            {keywords.length === 0 && <p className="text-sm text-gray-500">No keywords yet.</p>}
          </div>
        </section>

        <section className="rounded-xl border border-surface-border bg-surface-raised p-5">
          <h2 className="mb-4 font-semibold">Domain Availability</h2>
          {availability.map((a) => (
            <div key={String(a.domain)} className="flex justify-between text-sm">
              <span className="font-mono">{String(a.domain)}</span>
              <span>{a.available === true ? "✓" : a.available === false ? "✗" : "?"}</span>
            </div>
          ))}
          {availability.length === 0 && (
            <p className="text-sm text-gray-500">Availability check pending…</p>
          )}
        </section>

        <section className="col-span-full rounded-xl border border-surface-border bg-surface-raised p-5">
          <h2 className="mb-4 font-semibold">Recent Polls</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500">
                <th className="py-2 text-left">Time</th>
                <th className="py-2 text-left">HTTP</th>
                <th className="py-2 text-left">DOM hash</th>
              </tr>
            </thead>
            <tbody>
              {polls.map((p, i) => (
                <tr key={i} className="border-t border-surface-border/50">
                  <td className="py-2">{new Date(String(p.polled_at)).toLocaleString()}</td>
                  <td className="py-2">{String(p.http_status ?? "—")}</td>
                  <td className="py-2 font-mono text-xs">{String(p.dom_hash ?? "—").slice(0, 12)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
