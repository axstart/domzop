"use client";

import Link from "next/link";
import { CandidateTable } from "@/components/CandidateTable";
import { ModuleSwitcher } from "@/components/ModuleSwitcher";
import { StatsBar } from "@/components/StatsBar";

export default function DomainsModulePage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-neon-gold">
            Domain module
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Domain research</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-400">
            Candidate pipeline, scoring, and investor reports for digital assets — separate from
            the property explorer.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/portfolio?asset_type=domain"
            className="rounded-lg border border-surface-border px-4 py-2 text-sm text-gray-300 hover:text-white"
          >
            Domain holdings
          </Link>
          <Link
            href="/reports"
            className="rounded-lg bg-neon-cyan/20 px-4 py-2 text-sm text-neon-cyan"
          >
            Reports
          </Link>
        </div>
      </header>

      <ModuleSwitcher />
      <StatsBar />
      <CandidateTable />
    </main>
  );
}
