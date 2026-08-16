"use client";

import { useCallback, useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

interface Report {
  id: string;
  title: string;
  candidate_count: number;
  generated_at: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selected, setSelected] = useState<{ markdown: string; title: string } | null>(null);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/reports");
    const data = await res.json();
    setReports(data.reports ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function generate() {
    setGenerating(true);
    await fetch("/api/reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "",
      },
      body: JSON.stringify({}),
    });
    setTimeout(() => {
      load();
      setGenerating(false);
    }, 3000);
  }

  async function viewReport(id: string) {
    const res = await fetch(`/api/reports?id=${id}`);
    const data = await res.json();
    if (data.report) {
      setSelected({
        title: data.report.title,
        markdown: data.report.report_markdown ?? "",
      });
    }
  }

  function downloadMarkdown() {
    if (!selected) return;
    const blob = new Blob([selected.markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selected.title.replace(/\s+/g, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Investment Reports</h1>
        <p className="mt-2 text-gray-400">
          Generated reports filtered by investor profiles and score thresholds.
        </p>
      </header>
      <Nav />

      <button
        onClick={generate}
        disabled={generating}
        className="mb-6 rounded-lg bg-accent px-4 py-2 text-sm hover:bg-accent/80 disabled:opacity-50"
      >
        {generating ? "Generating…" : "Generate Reports Now"}
      </button>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          {reports.map((r) => (
            <button
              key={r.id}
              onClick={() => viewReport(r.id)}
              className="w-full rounded-xl border border-surface-border bg-surface-raised p-4 text-left hover:border-accent/50"
            >
              <h3 className="font-medium">{r.title}</h3>
              <p className="mt-1 text-xs text-gray-400">
                {r.candidate_count} candidates · {new Date(r.generated_at).toLocaleString()}
              </p>
            </button>
          ))}
          {reports.length === 0 && (
            <p className="text-gray-500">No reports yet. Generate one to get started.</p>
          )}
        </div>

        {selected && (
          <div className="rounded-xl border border-surface-border bg-surface-raised p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">{selected.title}</h3>
              <button
                onClick={downloadMarkdown}
                className="rounded bg-surface-border px-3 py-1 text-xs hover:text-white"
              >
                Download .md
              </button>
            </div>
            <pre className="max-h-[600px] overflow-auto whitespace-pre-wrap text-xs text-gray-300">
              {selected.markdown}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
