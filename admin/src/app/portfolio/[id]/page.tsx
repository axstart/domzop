"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { formatMoney, formatSignedMoney, plClass, unrealizedPl } from "@/lib/money";
import type {
  AssetStatus,
  OccupancyType,
  PortfolioAsset,
  PropertyType,
  Valuation,
  ValuationSource,
} from "@/lib/portfolio-types";

const inputClass =
  "rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-gray-100";
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

function dateInput(value: string | null | undefined): string {
  return value ? String(value).slice(0, 10) : "";
}

export default function AssetDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [asset, setAsset] = useState<PortfolioAsset | null>(null);
  const [valuations, setValuations] = useState<Valuation[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mark, setMark] = useState({ value: "", source: "manual" as ValuationSource, notes: "" });

  const [form, setForm] = useState({
    name: "",
    status: "owned" as AssetStatus,
    acquisition_cost: "",
    current_value: "",
    notes: "",
    acquired_at: "",
    domain_name: "",
    registrar: "",
    expiry_date: "",
    auto_renew: false,
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
    monthly_rent: "",
    annual_taxes: "",
    hoa_fees: "",
    listing_url: "",
  });

  useEffect(() => {
    fetch(`/api/portfolio/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.asset) return;
        const a = data.asset as PortfolioAsset;
        setAsset(a);
        setValuations(data.valuations ?? []);
        setForm({
          name: a.name,
          status: a.status,
          acquisition_cost: a.acquisition_cost != null ? String(a.acquisition_cost) : "",
          current_value: a.current_value != null ? String(a.current_value) : "",
          notes: a.notes ?? "",
          acquired_at: dateInput(a.acquired_at),
          domain_name: a.domain?.domain_name ?? "",
          registrar: a.domain?.registrar ?? "",
          expiry_date: dateInput(a.domain?.expiry_date),
          auto_renew: a.domain?.auto_renew ?? false,
          address: a.real_estate?.address ?? "",
          city: a.real_estate?.city ?? "",
          region: a.real_estate?.region ?? "",
          country: a.real_estate?.country ?? "",
          postal_code: a.real_estate?.postal_code ?? "",
          property_type: a.real_estate?.property_type ?? "residential",
          occupancy: a.real_estate?.occupancy ?? "",
          bedrooms: a.real_estate?.bedrooms != null ? String(a.real_estate.bedrooms) : "",
          bathrooms: a.real_estate?.bathrooms != null ? String(a.real_estate.bathrooms) : "",
          square_feet:
            a.real_estate?.square_feet != null ? String(a.real_estate.square_feet) : "",
          year_built: a.real_estate?.year_built != null ? String(a.real_estate.year_built) : "",
          monthly_rent:
            a.real_estate?.monthly_rent != null ? String(a.real_estate.monthly_rent) : "",
          annual_taxes:
            a.real_estate?.annual_taxes != null ? String(a.real_estate.annual_taxes) : "",
          hoa_fees: a.real_estate?.hoa_fees != null ? String(a.real_estate.hoa_fees) : "",
          listing_url: a.real_estate?.listing_url ?? "",
        });
      });
  }, [params.id]);

  async function save() {
    if (!asset) return;
    setSaving(true);
    setError(null);
    const body: Record<string, unknown> = {
      name: form.name,
      status: form.status,
      acquisition_cost: numOrNull(form.acquisition_cost),
      current_value: numOrNull(form.current_value),
      notes: form.notes || null,
      acquired_at: form.acquired_at || null,
    };
    if (asset.asset_type === "domain") {
      body.domain = {
        domain_name: form.domain_name,
        registrar: form.registrar || null,
        expiry_date: form.expiry_date || null,
        auto_renew: form.auto_renew,
      };
    } else {
      body.real_estate = {
        address: form.address,
        city: form.city || null,
        region: form.region || null,
        country: form.country || null,
        postal_code: form.postal_code || null,
        property_type: form.property_type,
        occupancy: form.occupancy || null,
        bedrooms: numOrNull(form.bedrooms),
        bathrooms: numOrNull(form.bathrooms),
        square_feet: numOrNull(form.square_feet),
        year_built: numOrNull(form.year_built),
        monthly_rent: numOrNull(form.monthly_rent),
        annual_taxes: numOrNull(form.annual_taxes),
        hoa_fees: numOrNull(form.hoa_fees),
        listing_url: form.listing_url || null,
      };
    }
    const res = await fetch(`/api/portfolio/${params.id}`, {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Save failed");
      return;
    }
    setAsset(data.asset);
  }

  async function addMark() {
    const value = Number(mark.value);
    if (!Number.isFinite(value)) return;
    const res = await fetch(`/api/portfolio/${params.id}/valuations`, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({
        value,
        source: mark.source,
        notes: mark.notes || null,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setValuations((prev) => [data.valuation, ...prev]);
      setForm((f) => ({ ...f, current_value: String(value) }));
      setMark({ value: "", source: "manual", notes: "" });
      const refreshed = await fetch(`/api/portfolio/${params.id}`).then((r) => r.json());
      if (refreshed.asset) setAsset(refreshed.asset);
    }
  }

  async function remove() {
    if (!confirm("Remove this holding from the portfolio?")) return;
    await fetch(`/api/portfolio/${params.id}`, {
      method: "DELETE",
      headers: adminHeaders(),
    });
    router.push("/portfolio");
  }

  if (!asset) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Nav />
        <p className="text-gray-500">Loading…</p>
      </main>
    );
  }

  const pl = unrealizedPl(numOrNull(form.acquisition_cost), numOrNull(form.current_value));

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Nav />
      <Link href="/portfolio" className="text-sm text-accent-muted hover:underline">
        ← Back to holdings
      </Link>

      <header className="mt-4 mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-accent-muted">
            {asset.asset_type === "real_estate" ? "Real estate" : "Domain"}
          </p>
          <h1 className="mt-1 text-3xl font-bold">{asset.name}</h1>
          {asset.candidate_id && (
            <Link
              href={`/candidates/${asset.candidate_id}`}
              className="mt-2 inline-block text-xs text-accent-muted hover:underline"
            >
              View research candidate
            </Link>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs uppercase text-gray-500">Unrealized P/L</p>
          <p className={`text-2xl font-semibold ${plClass(pl)}`}>
            {formatSignedMoney(pl, asset.currency)}
          </p>
        </div>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-surface-border bg-surface-raised px-5 py-4">
          <p className="text-xs uppercase text-gray-500">Cost basis</p>
          <p className="mt-1 text-xl font-semibold">
            {formatMoney(numOrNull(form.acquisition_cost), asset.currency)}
          </p>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface-raised px-5 py-4">
          <p className="text-xs uppercase text-gray-500">Current value</p>
          <p className="mt-1 text-xl font-semibold text-accent-muted">
            {formatMoney(numOrNull(form.current_value), asset.currency)}
          </p>
        </div>
      </div>

      <div className="mb-8 space-y-4 rounded-xl border border-surface-border bg-surface-raised p-6">
        {asset.asset_type === "domain" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Domain name</label>
              <input
                className={`${inputClass} w-full font-mono`}
                value={form.domain_name}
                onChange={(e) => setForm({ ...form, domain_name: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Registrar</label>
              <input
                className={`${inputClass} w-full`}
                value={form.registrar}
                onChange={(e) => setForm({ ...form, registrar: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Expiry</label>
              <input
                type="date"
                className={`${inputClass} w-full`}
                value={form.expiry_date}
                onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.auto_renew}
                onChange={(e) => setForm({ ...form, auto_renew: e.target.checked })}
              />
              Auto-renew
            </label>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Address</label>
              <input
                className={`${inputClass} w-full`}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>City</label>
              <input
                className={`${inputClass} w-full`}
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Region / state</label>
              <input
                className={`${inputClass} w-full`}
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Country</label>
              <input
                className={`${inputClass} w-full`}
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Postal code</label>
              <input
                className={`${inputClass} w-full`}
                value={form.postal_code}
                onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Type</label>
              <select
                className={`${inputClass} w-full`}
                value={form.property_type}
                onChange={(e) =>
                  setForm({ ...form, property_type: e.target.value as PropertyType })
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
                value={form.occupancy}
                onChange={(e) =>
                  setForm({ ...form, occupancy: e.target.value as OccupancyType | "" })
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
                value={form.bedrooms}
                onChange={(e) => setForm({ ...form, bedrooms: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Bathrooms</label>
              <input
                type="number"
                step="0.5"
                className={`${inputClass} w-full`}
                value={form.bathrooms}
                onChange={(e) => setForm({ ...form, bathrooms: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Sq ft</label>
              <input
                type="number"
                className={`${inputClass} w-full`}
                value={form.square_feet}
                onChange={(e) => setForm({ ...form, square_feet: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Year built</label>
              <input
                type="number"
                className={`${inputClass} w-full`}
                value={form.year_built}
                onChange={(e) => setForm({ ...form, year_built: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Monthly rent</label>
              <input
                type="number"
                className={`${inputClass} w-full`}
                value={form.monthly_rent}
                onChange={(e) => setForm({ ...form, monthly_rent: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Annual taxes</label>
              <input
                type="number"
                className={`${inputClass} w-full`}
                value={form.annual_taxes}
                onChange={(e) => setForm({ ...form, annual_taxes: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>HOA fees</label>
              <input
                type="number"
                className={`${inputClass} w-full`}
                value={form.hoa_fees}
                onChange={(e) => setForm({ ...form, hoa_fees: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Listing URL</label>
              <input
                className={`${inputClass} w-full`}
                value={form.listing_url}
                onChange={(e) => setForm({ ...form, listing_url: e.target.value })}
              />
            </div>
          </div>
        )}

        <div className="grid gap-4 border-t border-surface-border pt-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Name</label>
            <input
              className={`${inputClass} w-full`}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select
              className={`${inputClass} w-full`}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as AssetStatus })}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Cost basis</label>
            <input
              type="number"
              className={`${inputClass} w-full`}
              value={form.acquisition_cost}
              onChange={(e) => setForm({ ...form, acquisition_cost: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Current value</label>
            <input
              type="number"
              className={`${inputClass} w-full`}
              value={form.current_value}
              onChange={(e) => setForm({ ...form, current_value: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Acquired</label>
            <input
              type="date"
              className={`${inputClass} w-full`}
              value={form.acquired_at}
              onChange={(e) => setForm({ ...form, acquired_at: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Notes</label>
            <textarea
              className={`${inputClass} w-full`}
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button
            onClick={remove}
            className="rounded-lg bg-surface-border px-4 py-2 text-sm text-gray-400 hover:text-white"
          >
            Remove holding
          </button>
        </div>
      </div>

      <section className="rounded-xl border border-surface-border bg-surface-raised p-6">
        <h2 className="mb-4 font-semibold">Valuation history</h2>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <input
            type="number"
            placeholder="New mark"
            className={inputClass}
            value={mark.value}
            onChange={(e) => setMark({ ...mark, value: e.target.value })}
          />
          <select
            className={inputClass}
            value={mark.source}
            onChange={(e) => setMark({ ...mark, source: e.target.value as ValuationSource })}
          >
            <option value="manual">manual</option>
            <option value="appraisal">appraisal</option>
            <option value="estimate">estimate</option>
          </select>
          <input
            placeholder="Notes"
            className={inputClass}
            value={mark.notes}
            onChange={(e) => setMark({ ...mark, notes: e.target.value })}
          />
        </div>
        <button
          onClick={addMark}
          className="mb-6 rounded-lg bg-accent px-3 py-1.5 text-sm hover:bg-accent/80"
        >
          Record valuation
        </button>
        {valuations.length === 0 ? (
          <p className="text-sm text-gray-500">No marks yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase text-gray-500">
                <th className="py-2 text-left">Date</th>
                <th className="py-2 text-left">Value</th>
                <th className="py-2 text-left">Source</th>
                <th className="py-2 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {valuations.map((v) => (
                <tr key={v.id} className="border-t border-surface-border/50">
                  <td className="py-2 text-gray-400">
                    {new Date(v.valued_at).toLocaleString()}
                  </td>
                  <td className="py-2 font-mono">{formatMoney(v.value, asset.currency)}</td>
                  <td className="py-2 capitalize">{v.source}</td>
                  <td className="py-2 text-gray-400">{v.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
