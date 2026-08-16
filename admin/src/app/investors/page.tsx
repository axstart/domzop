"use client";

import { useCallback, useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

const CATEGORIES = [
  "saas",
  "ai",
  "fintech",
  "devtools",
  "productivity",
  "health",
  "ecommerce",
  "general",
];

interface Profile {
  id: string;
  name: string;
  email: string | null;
  categories: string[];
  min_score: number;
  tlds: string[];
  budget_usd: number | null;
  excluded_keywords: string[];
  active: boolean;
}

export default function InvestorsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    categories: ["saas", "ai"] as string[],
    min_score: 60,
    tlds: ["com"],
    budget_usd: 50,
    excluded_keywords: "",
  });

  const load = useCallback(async () => {
    const res = await fetch("/api/investors");
    const data = await res.json();
    setProfiles(data.profiles ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    await fetch("/api/investors", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "",
      },
      body: JSON.stringify({
        ...form,
        excluded_keywords: form.excluded_keywords
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    });
    setShowForm(false);
    load();
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/investors/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "",
      },
      body: JSON.stringify({ active: !active }),
    });
    load();
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Investor Profiles</h1>
        <p className="mt-2 text-gray-400">
          Configure interest filters for automated investment reports.
        </p>
      </header>
      <Nav />

      <div className="mb-6">
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-accent px-4 py-2 text-sm hover:bg-accent/80"
        >
          {showForm ? "Cancel" : "New Profile"}
        </button>
      </div>

      {showForm && (
        <div className="mb-8 rounded-xl border border-surface-border bg-surface-raised p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <input
              placeholder="Profile name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-lg border border-surface-border bg-surface px-3 py-2"
            />
            <input
              placeholder="Email (optional)"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded-lg border border-surface-border bg-surface px-3 py-2"
            />
            <input
              type="number"
              placeholder="Min score"
              value={form.min_score}
              onChange={(e) => setForm({ ...form, min_score: Number(e.target.value) })}
              className="rounded-lg border border-surface-border bg-surface px-3 py-2"
            />
            <input
              type="number"
              placeholder="Budget USD"
              value={form.budget_usd}
              onChange={(e) => setForm({ ...form, budget_usd: Number(e.target.value) })}
              className="rounded-lg border border-surface-border bg-surface px-3 py-2"
            />
            <input
              placeholder="Excluded keywords (comma-separated)"
              value={form.excluded_keywords}
              onChange={(e) => setForm({ ...form, excluded_keywords: e.target.value })}
              className="col-span-2 rounded-lg border border-surface-border bg-surface px-3 py-2"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  const cats = form.categories.includes(cat)
                    ? form.categories.filter((c) => c !== cat)
                    : [...form.categories, cat];
                  setForm({ ...form, categories: cats });
                }}
                className={`rounded-full px-3 py-1 text-xs capitalize ${
                  form.categories.includes(cat)
                    ? "bg-accent text-white"
                    : "bg-surface-border text-gray-400"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <button
            onClick={create}
            className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm hover:bg-emerald-500"
          >
            Create Profile
          </button>
        </div>
      )}

      <div className="space-y-4">
        {profiles.map((p) => (
          <div
            key={p.id}
            className="rounded-xl border border-surface-border bg-surface-raised p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{p.name}</h3>
                {p.email && <p className="text-sm text-gray-400">{p.email}</p>}
              </div>
              <button
                onClick={() => toggleActive(p.id, p.active)}
                className={`rounded-full px-3 py-1 text-xs ${
                  p.active ? "bg-emerald-500/20 text-emerald-300" : "bg-gray-500/20 text-gray-400"
                }`}
              >
                {p.active ? "Active" : "Inactive"}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-400">
              <span>Min score: {p.min_score}</span>
              <span>TLDs: {p.tlds.join(", ")}</span>
              {p.budget_usd && <span>Budget: ${p.budget_usd}</span>}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {p.categories.map((c) => (
                <span key={c} className="rounded bg-surface-border px-2 py-0.5 text-xs capitalize">
                  {c}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
