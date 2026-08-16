import { CandidateTable } from "@/components/CandidateTable";
import { Nav } from "@/components/Nav";
import { StatsBar } from "@/components/StatsBar";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-6">
        <p className="text-sm font-medium uppercase tracking-widest text-accent-muted">
          Domain Investing Research Lab
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Candidate Pipeline</h1>
        <p className="mt-2 max-w-2xl text-gray-400">
          Discovery bots find deployments on Vercel, Netlify, and Render. Research bots score
          investment potential and generate investor reports.
        </p>
      </header>

      <Nav />
      <StatsBar />
      <CandidateTable />
    </main>
  );
}
