"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AxPanel } from "@/components/AxPanel";
import { ModuleSwitcher } from "@/components/ModuleSwitcher";
import { SpringCard, SpringChip } from "@/components/Spring";
import { citiesForCountry, countriesList } from "@/lib/geo";
import { formatMoney } from "@/lib/money";
import type { PropertyCard } from "@/lib/portfolio-types";

const PropertyMap = dynamic(
  () => import("@/components/PropertyMap").then((m) => m.PropertyMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[360px] items-center justify-center text-sm text-gray-500">
        Loading map…
      </div>
    ),
  },
);

export default function PropertiesModulePage() {
  const [country, setCountry] = useState("United States");
  const [city, setCity] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [view, setView] = useState<"gallery" | "map">("gallery");
  const [cards, setCards] = useState<PropertyCard[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<string>("");

  const cities = useMemo(() => citiesForCountry(country), [country]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (country) params.set("country", country);
    if (city) params.set("city", city);
    if (minPrice) params.set("min_price", minPrice);
    if (maxPrice) params.set("max_price", maxPrice);
    params.set("include_owned", "1");
    const res = await fetch(`/api/properties?${params}`);
    const data = await res.json();
    const list: PropertyCard[] = data.properties ?? [];
    setCards(list);
    setSource(data.source ?? "");
    setSelectedId((prev) => (prev && list.some((c) => c.asset.id === prev) ? prev : list[0]?.asset.id ?? null));
    setLoading(false);
  }, [country, city, minPrice, maxPrice]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setCity("");
  }, [country]);

  const selected = cards.find((c) => c.asset.id === selectedId) ?? null;

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-6 lg:px-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-neon-gold">
            Property module
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Explore listings</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-400">
            Pick a country and city, filter by value, browse photos, open the map, and read Ax
            Panel intelligence for the selected property.
          </p>
        </div>
        <Link
          href="/portfolio/new?type=real_estate"
          className="rounded-lg bg-neon-cyan/20 px-4 py-2 text-sm text-neon-cyan shadow-neon"
        >
          Add listing
        </Link>
      </header>

      <ModuleSwitcher />

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-surface-border bg-surface-raised/80 p-4">
        <Field label="Country">
          <select
            className="field"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            {countriesList().map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="City">
          <select className="field" value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">All cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Min value">
          <input
            type="number"
            className="field w-32"
            placeholder="0"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
        </Field>
        <Field label="Max value">
          <input
            type="number"
            className="field w-32"
            placeholder="Any"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </Field>
        <div className="flex gap-2">
          <SpringChip
            active={view === "gallery"}
            onClick={() => setView("gallery")}
            className={`rounded-lg px-3 py-2 text-sm ${
              view === "gallery" ? "bg-neon-cyan/20 text-neon-cyan" : "text-gray-400"
            }`}
          >
            Gallery
          </SpringChip>
          <SpringChip
            active={view === "map"}
            onClick={() => setView("map")}
            className={`rounded-lg px-3 py-2 text-sm ${
              view === "map" ? "bg-neon-cyan/20 text-neon-cyan" : "text-gray-400"
            }`}
          >
            Map
          </SpringChip>
        </div>
        {source === "demo" && (
          <p className="text-xs text-neon-gold">Showing sample listings until DB is connected.</p>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
        <section className="min-h-[520px]">
          {loading ? (
            <p className="text-gray-500">Loading properties…</p>
          ) : cards.length === 0 ? (
            <div className="rounded-2xl border border-surface-border bg-surface-raised p-10 text-center text-gray-500">
              No listings in this range. Try another city or widen the value filter.
            </div>
          ) : view === "map" ? (
            <PropertyMap
              properties={cards}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {cards.map((card) => {
                const re = card.asset.real_estate;
                const active = card.asset.id === selectedId;
                return (
                  <SpringCard
                    key={card.asset.id}
                    active={active}
                    onClick={() => setSelectedId(card.asset.id)}
                    className={`overflow-hidden rounded-2xl border text-left ${
                      active
                        ? "border-neon-cyan shadow-neon"
                        : "border-surface-border hover:border-neon-cyan/40"
                    }`}
                  >
                    <div className="relative aspect-[16/10] bg-black/50">
                      {re?.image_url ? (
                        <Image
                          src={re.image_url}
                          alt={card.asset.name}
                          fill
                          className="object-cover"
                          sizes="(max-width:768px) 100vw, 40vw"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-gray-600">
                          No photo
                        </div>
                      )}
                      <span className="absolute bottom-3 left-3 rounded-md bg-black/70 px-2 py-1 text-sm font-semibold text-neon-cyan">
                        {formatMoney(
                          card.asset.current_value ?? card.asset.acquisition_cost,
                          card.asset.currency,
                        )}
                      </span>
                    </div>
                    <div className="bg-surface-raised p-4">
                      <p className="text-[10px] uppercase tracking-wide text-gray-500">
                        {re?.property_type} · {re?.city}
                      </p>
                      <h2 className="mt-1 font-semibold">{card.asset.name}</h2>
                      <p className="mt-1 truncate text-xs text-gray-400">{re?.address}</p>
                      <p className="mt-2 text-xs text-neon-gold">
                        Score {card.intelligence_score != null ? Math.round(card.intelligence_score) : "—"} ·{" "}
                        <span className="capitalize">{card.outlook ?? "—"}</span>
                      </p>
                    </div>
                  </SpringCard>
                );
              })}
            </div>
          )}
        </section>

        <AxPanel selected={selected} />
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block uppercase tracking-wide text-gray-500">{label}</span>
      {children}
    </label>
  );
}
