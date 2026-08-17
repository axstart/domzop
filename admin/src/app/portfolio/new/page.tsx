"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Nav } from "@/components/Nav";
import type { AssetStatus, AssetType, OccupancyType, PropertyType } from "@/lib/portfolio-types";

const inputClass =
  "rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500";
const labelClass = "mb-1 block text-xs uppercase tracking-wide text-gray-500";

const STATUSES: AssetStatus[] = ["owned", "watchlist", "listed", "sold", "discarded"];
const PROPERTY_TYPES: PropertyType[] = [
  "residential",
  "commercial",
  "land",
  "mixed",
  "other",
];
const OCCUPANCY: OccupancyType[] = ["vacant", "owner", "rented"];

function numOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function adminHeaders() {
  return {
    "Content-Type": "application/json",
    "x-admin-secret": process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "",
  };
}

export default function NewHoldingPage() {
  const router = useRouter();
  const [assetType, setAssetType] = useState<AssetType>("real_estate");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [shared, setShared] = useState({
    name: "",
    status: "owned" as AssetStatus,
    acquisition_cost: "",
    current_value: "",
    notes: "",
    acquired_at: "",
  });

  const [domain, setDomain] = useState({
    domain_name: "",
    registrar: "",
    expiry_date: "",
    auto_renew: false,
  });

  const [re, setRe] = useState({
    address: "",
    city: "",
    region: "",
    country: "",
    postal_code: "",
    property_type: "residential" as PropertyType,
    occupancy: "" as "" | OccupancyType,
    bedrooms: "",
    bathrooms: "",
    square_feet: "",
    year_built: "",
    lot_size: "",
    monthly_rent: "",
    annual_taxes: "",
    hoa_fees: "",
    listing_url: "",
  });

  async function submit() {
    setSaving(true);
    setError(null);
    const body: Record<string, unknown> = {
      asset_type: assetType,
      name: shared.name || undefined,
      status: shared.status,
      acquisition_cost: numOrNull(shared.acquisition_cost),
      current_value: numOrNull(shared.current_value),
      notes: shared.notes || null,
      acquired_at: shared.acquired_at || null,
    };
    if (assetType === "domain") {
      body.domain = {
        domain_name: domain.domain_name,
        registrar: domain.registrar || null,
        expiry_date: domain.expiry_date || null,
        auto_renew: domain.auto_renew,
      };
    } else {
      body.real_estate = {
        address: re.address,
        city: re.city || null,
        region: re.region || null,
        country: re.country || null,
        postal_code: re.postal_code || null,
        property_type: re.property_type,
        occupancy: re.occupancy || null,
        bedrooms: numOrNull(re.bedrooms),
        bathrooms: numOrNull(re.bathrooms),
        square_feet: numOrNull(re.square_feet),
        year_built: numOrNull(re.year_built),
        lot_size: numOrNull(re.lot_size),
        monthly_rent: numOrNull(re.monthly_rent),
        annual_taxes: numOrNull(re.annual_taxes),
        hoa_fees: numOrNull(re.hoa_fees),
        listing_url: re.listing_url || null,
      };
    }

    const res = await fetch("/api/portfolio", {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to add holding");
      return;
    }
    router.push(`/portfolio/${data.asset.id}`);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Nav />
      <Link href="/portfolio" className="text-sm text-accent-muted hover:underline">
        ← Back to holdings
      </Link>
      <header className="mt-4 mb-8">
        <h1 className="text-3xl font-bold">Add holding</h1>
        <p className="mt-2 text-gray-400">
          Book a real estate property or a domain into the portfolio.
        </p>
      </header>

      <div className="mb-6 flex gap-2">
        {(
          [
            ["real_estate", "Real estate"],
            ["domain", "Domain"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setAssetType(key)}
            className={`rounded-lg px-4 py-2 text-sm ${
              assetType === key ? "bg-accent text-white" : "bg-surface-border text-gray-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-6 rounded-xl border border-surface-border bg-surface-raised p-6">
        {assetType === "real_estate" ? (
          <>
            <div>
              <label className={labelClass}>Address</label>
              <input
                className={`${inputClass} w-full`}
                value={re.address}
                onChange={(e) => setRe({ ...re, address: e.target.value })}
                placeholder="123 Market St"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>City</label>
                <input
                  className={`${inputClass} w-full`}
                  value={re.city}
                  onChange={(e) => setRe({ ...re, city: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Region / state</label>
                <input
                  className={`${inputClass} w-full`}
                  value={re.region}
                  onChange={(e) => setRe({ ...re, region: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Country</label>
                <input
                  className={`${inputClass} w-full`}
                  value={re.country}
                  onChange={(e) => setRe({ ...re, country: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Postal code</label>
                <input
                  className={`${inputClass} w-full`}
                  value={re.postal_code}
                  onChange={(e) => setRe({ ...re, postal_code: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Property type</label>
                <select
                  className={`${inputClass} w-full`}
                  value={re.property_type}
                  onChange={(e) =>
                    setRe({ ...re, property_type: e.target.value as PropertyType })
                  }
                >
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Occupancy</label>
                <select
                  className={`${inputClass} w-full`}
                  value={re.occupancy}
                  onChange={(e) =>
                    setRe({ ...re, occupancy: e.target.value as OccupancyType | "" })
                  }
                >
                  <option value="">—</option>
                  {OCCUPANCY.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Bedrooms</label>
                <input
                  type="number"
                  className={`${inputClass} w-full`}
                  value={re.bedrooms}
                  onChange={(e) => setRe({ ...re, bedrooms: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Bathrooms</label>
                <input
                  type="number"
                  step="0.5"
                  className={`${inputClass} w-full`}
                  value={re.bathrooms}
                  onChange={(e) => setRe({ ...re, bathrooms: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Square feet</label>
                <input
                  type="number"
                  className={`${inputClass} w-full`}
                  value={re.square_feet}
                  onChange={(e) => setRe({ ...re, square_feet: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Year built</label>
                <input
                  type="number"
                  className={`${inputClass} w-full`}
                  value={re.year_built}
                  onChange={(e) => setRe({ ...re, year_built: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Monthly rent</label>
                <input
                  type="number"
                  className={`${inputClass} w-full`}
                  value={re.monthly_rent}
                  onChange={(e) => setRe({ ...re, monthly_rent: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Annual taxes</label>
                <input
                  type="number"
                  className={`${inputClass} w-full`}
                  value={re.annual_taxes}
                  onChange={(e) => setRe({ ...re, annual_taxes: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>HOA fees</label>
                <input
                  type="number"
                  className={`${inputClass} w-full`}
                  value={re.hoa_fees}
                  onChange={(e) => setRe({ ...re, hoa_fees: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Listing URL</label>
                <input
                  className={`${inputClass} w-full`}
                  value={re.listing_url}
                  onChange={(e) => setRe({ ...re, listing_url: e.target.value })}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Domain name</label>
              <input
                className={`${inputClass} w-full font-mono`}
                value={domain.domain_name}
                onChange={(e) => setDomain({ ...domain, domain_name: e.target.value })}
                placeholder="example.com"
              />
              <p className="mt-1 text-xs text-gray-500">
                If this domain already exists as a research candidate, it will be linked.
              </p>
            </div>
            <div>
              <label className={labelClass}>Registrar</label>
              <input
                className={`${inputClass} w-full`}
                value={domain.registrar}
                onChange={(e) => setDomain({ ...domain, registrar: e.target.value })}
                placeholder="Namecheap"
              />
            </div>
            <div>
              <label className={labelClass}>Expiry date</label>
              <input
                type="date"
                className={`${inputClass} w-full`}
                value={domain.expiry_date}
                onChange={(e) => setDomain({ ...domain, expiry_date: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-300 sm:col-span-2">
              <input
                type="checkbox"
                checked={domain.auto_renew}
                onChange={(e) => setDomain({ ...domain, auto_renew: e.target.checked })}
              />
              Auto-renew
            </label>
          </div>
        )}

        <div className="grid gap-4 border-t border-surface-border pt-6 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Display name (optional)</label>
            <input
              className={`${inputClass} w-full`}
              value={shared.name}
              onChange={(e) => setShared({ ...shared, name: e.target.value })}
              placeholder={assetType === "domain" ? "Uses domain name if blank" : "Uses address if blank"}
            />
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select
              className={`${inputClass} w-full`}
              value={shared.status}
              onChange={(e) => setShared({ ...shared, status: e.target.value as AssetStatus })}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Acquisition cost</label>
            <input
              type="number"
              className={`${inputClass} w-full`}
              value={shared.acquisition_cost}
              onChange={(e) => setShared({ ...shared, acquisition_cost: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Current value</label>
            <input
              type="number"
              className={`${inputClass} w-full`}
              value={shared.current_value}
              onChange={(e) => setShared({ ...shared, current_value: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Acquired at</label>
            <input
              type="date"
              className={`${inputClass} w-full`}
              value={shared.acquired_at}
              onChange={(e) => setShared({ ...shared, acquired_at: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Notes</label>
            <textarea
              className={`${inputClass} w-full`}
              rows={3}
              value={shared.notes}
              onChange={(e) => setShared({ ...shared, notes: e.target.value })}
            />
          </div>
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <button
          onClick={submit}
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Add to portfolio"}
        </button>
      </div>
    </main>
  );
}
