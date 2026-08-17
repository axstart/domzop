export function toNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function formatMoney(
  value: number | string | null | undefined,
  currency = "USD",
): string {
  const n = toNumber(value);
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatSignedMoney(value: number | null, currency = "USD"): string {
  if (value == null) return "—";
  const formatted = formatMoney(Math.abs(value), currency);
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `−${formatted}`;
  return formatted;
}

export function plClass(value: number | null): string {
  if (value == null || value === 0) return "text-gray-300";
  return value > 0 ? "text-emerald-400" : "text-rose-400";
}

export function unrealizedPl(
  cost: number | null | undefined,
  value: number | null | undefined,
): number | null {
  const c = toNumber(cost);
  const v = toNumber(value);
  if (c == null || v == null) return null;
  return v - c;
}

export function allocationPercents(domainValue: number, realEstateValue: number): {
  domain: number;
  realEstate: number;
} {
  const total = domainValue + realEstateValue;
  if (total <= 0) return { domain: 0, realEstate: 0 };
  const domain = Math.round((domainValue / total) * 100);
  return { domain, realEstate: 100 - domain };
}
