import { CandidateTable } from "@/components/CandidateTable";
import { Nav } from "@/components/Nav";
import { StatsBar } from "@/components/StatsBar";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-6">
        <p className="text-sm font-medium uppercase tracking-widest text-accent-muted">
          Research lab
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Candidate Pipeline</h1>
        <p className="mt-2 max-w-2xl text-gray-400">
          Surface high-signal domain opportunities. Acquired names land in Portfolio alongside
          real estate holdings.
        </p>
      </header>

      <Nav />
      <StatsBar />
      <CandidateTable />
    </main>
  );
}
