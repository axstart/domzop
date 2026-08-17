"use client";

import { useCallback, useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

interface BotRun {
  bot_name: string;
  status: string;
  started_at: string | null;
  jobs_processed: number;
  jobs_failed: number;
  last_run: string;
}

export default function BotsPage() {
  const [bots, setBots] = useState<BotRun[]>([]);
  const [queues, setQueues] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    const res = await fetch("/api/bots");
    const data = await res.json();
    setBots(data.bots ?? []);
    setQueues(data.queues ?? {});
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15_000);
    return () => clearInterval(interval);
  }, [load]);

  const expectedBots = [
    "keyword-extractor",
    "research",
    "availability",
    "scoring",
    "report",
  ];

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Bot Status</h1>
        <p className="mt-2 text-gray-400">
          Parallel worker status, queue depths, and last run times.
        </p>
      </header>
      <Nav />

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold">Queue Depths</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(queues).map(([name, depth]) => (
            <div
              key={name}
              className="rounded-xl border border-surface-border bg-surface-raised p-4"
            >
              <p className="font-mono text-xs text-gray-500">{name}</p>
              <p className="mt-1 text-2xl font-bold">{depth}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Bot Runs</h2>
        <div className="overflow-x-auto rounded-xl border border-surface-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-surface-border text-xs uppercase text-gray-500">
                <th className="px-5 py-3">Bot</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Jobs OK</th>
                <th className="px-5 py-3">Jobs Failed</th>
                <th className="px-5 py-3">Last Run</th>
              </tr>
            </thead>
            <tbody>
              {expectedBots.map((name) => {
                const bot = bots.find((b) => b.bot_name === name);
                return (
                  <tr key={name} className="border-b border-surface-border/50">
                    <td className="px-5 py-3 font-medium">{name}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          bot?.status === "running"
                            ? "bg-blue-500/20 text-blue-300"
                            : bot?.status === "completed"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {bot?.status ?? "not started"}
                      </span>
                    </td>
                    <td className="px-5 py-3">{bot?.jobs_processed ?? "—"}</td>
                    <td className="px-5 py-3">{bot?.jobs_failed ?? "—"}</td>
                    <td className="px-5 py-3 text-gray-400">
                      {bot?.last_run ? new Date(bot.last_run).toLocaleString() : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-gray-500">
          Candidate intake runs via discovery-bot. Site polling runs via poll-worker.
        </p>
      </section>
    </main>
  );
}
