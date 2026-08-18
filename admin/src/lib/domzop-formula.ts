/**
 * Domzop Formula — real estate intelligence (proprietary v1)
 *
 * Version string: domzop-re-v1
 *
 * This is NOT an MLS, appraisal, or consumer-portal replica. It is an internal
 * composite used to rank owned holdings and watchlist listings, and to project
 * simple 1y/3y/5y marks from factors we control:
 *
 *   - location momentum (editable 0–100 city/region score)
 *   - income yield (rent / value)
 *   - risk (taxes, vacancy, condition, age)
 *   - catalysts / related side projects (signed impact × confidence × horizon)
 *   - position quality (owned vs watching, presence of marks)
 *
 * Public UI shows factor *names* and *direction*, not these weights.
 */

export const FORMULA_VERSION = "domzop-re-v1";

/** Internal mix — keep out of public marketing copy. */
const WEIGHTS = {
  location: 0.28,
  yield: 0.22,
  catalysts: 0.18,
  risk: 0.16,
  position: 0.16,
} as const;

const HORIZON_MULT = { near: 1, mid: 0.72, long: 0.48 } as const;
const STATUS_MULT = {
  rumored: 0.45,
  proposed: 0.7,
  underway: 1,
  completed: 0.55,
} as const;

export type FormulaOutlook = "bullish" | "neutral" | "bearish";
export type FactorDirection = "tailwind" | "headwind" | "neutral";

export interface CatalystFactor {
  impact_direction: "positive" | "negative";
  impact_weight: number;
  confidence: number;
  horizon: "near" | "mid" | "long";
  status: "proposed" | "underway" | "completed" | "rumored";
}

export interface FormulaInput {
  current_value: number | null;
  acquisition_cost: number | null;
  monthly_rent: number | null;
  annual_taxes: number | null;
  hoa_fees: number | null;
  occupancy: "vacant" | "owner" | "rented" | null;
  location_momentum: number | null;
  condition_score: number | null;
  status: string;
  year_built: number | null;
  valuation_count: number;
  catalysts: CatalystFactor[];
}

export interface PublicFactor {
  key: string;
  label: string;
  score: number;
  direction: FactorDirection;
  note: string;
}

export interface FormulaResult {
  version: string;
  intelligence_score: number;
  predicted_delta_pct: { y1: number; y3: number; y5: number };
  predicted_value: { y1: number | null; y3: number | null; y5: number | null };
  outlook: FormulaOutlook;
  factors: PublicFactor[];
  catalyst_net: number;
  yield_pct: number | null;
  base_value: number | null;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round(n: number, digits = 2): number {
  const p = 10 ** digits;
  return Math.round(n * p) / p;
}

function tanh(x: number): number {
  const e = Math.exp(2 * x);
  return (e - 1) / (e + 1);
}

function directionFromScore(score: number): FactorDirection {
  if (score >= 58) return "tailwind";
  if (score <= 42) return "headwind";
  return "neutral";
}

function locationScore(input: FormulaInput): number {
  return clamp(input.location_momentum ?? 50, 0, 100);
}

function yieldPct(input: FormulaInput, base: number | null): number | null {
  if (base == null || base <= 0 || input.monthly_rent == null || input.monthly_rent <= 0) {
    return null;
  }
  return (input.monthly_rent * 12) / base;
}

function yieldScore(input: FormulaInput, yp: number | null): number {
  if (yp == null) {
    const fallback = input.occupancy === "rented" ? 48 : 42;
    return fallback;
  }
  // Map ~0%→22, 4%→55, 8%→82, 12%+→98
  const mapped = 22 + Math.min(yp, 0.14) * 550;
  let score = clamp(mapped, 0, 100);
  if (input.occupancy === "vacant") score *= 0.72;
  if (input.occupancy === "owner") score *= 0.88;
  return clamp(score, 0, 100);
}

function catalystNet(catalysts: CatalystFactor[]): number {
  if (!catalysts.length) return 50;
  let sum = 0;
  for (const c of catalysts) {
    const signed =
      (c.impact_direction === "negative" ? -1 : 1) * Math.abs(clamp(c.impact_weight, -100, 100));
    const conf = clamp(c.confidence, 0, 100) / 100;
    const h = HORIZON_MULT[c.horizon] ?? 0.72;
    const s = STATUS_MULT[c.status] ?? 0.7;
    sum += signed * conf * h * s;
  }
  // 50 = no net catalyst; tanh keeps outliers from dominating.
  return clamp(50 + 50 * tanh(sum / 140), 0, 100);
}

function riskScore(input: FormulaInput, base: number | null): number {
  let score = 62;
  if (base && base > 0 && input.annual_taxes != null) {
    const taxRatio = input.annual_taxes / base;
    score -= clamp(taxRatio * 900, 0, 35);
  }
  if (base && base > 0 && input.hoa_fees != null) {
    const hoaRatio = (input.hoa_fees * 12) / base;
    score -= clamp(hoaRatio * 600, 0, 18);
  }
  if (input.occupancy === "vacant") score -= 16;
  const condition = clamp(input.condition_score ?? 60, 0, 100);
  score = score * 0.65 + condition * 0.35;
  if (input.year_built != null) {
    const age = new Date().getFullYear() - input.year_built;
    if (age > 60) score -= 8;
    else if (age > 40) score -= 4;
  }
  return clamp(score, 0, 100);
}

function positionScore(input: FormulaInput, base: number | null): number {
  let score = 40;
  if (input.status === "owned") score = 68;
  else if (input.status === "listed") score = 58;
  else if (input.status === "watchlist") score = 52;
  if (base != null) score += 8;
  if (input.acquisition_cost != null && input.status === "owned") score += 6;
  score += Math.min(input.valuation_count * 3, 12);
  return clamp(score, 0, 100);
}

export function computeDomzopFormula(input: FormulaInput): FormulaResult {
  const base =
    input.current_value && input.current_value > 0
      ? input.current_value
      : input.acquisition_cost && input.acquisition_cost > 0
        ? input.acquisition_cost
        : null;

  const loc = locationScore(input);
  const yp = yieldPct(input, base);
  const yld = yieldScore(input, yp);
  const cat = catalystNet(input.catalysts);
  const risk = riskScore(input, base);
  const pos = positionScore(input, base);

  const intelligence = clamp(
    loc * WEIGHTS.location +
      yld * WEIGHTS.yield +
      cat * WEIGHTS.catalysts +
      risk * WEIGHTS.risk +
      pos * WEIGHTS.position,
    0,
    100,
  );

  const locTerm = (loc - 50) * 0.14;
  const yieldTerm = yp != null ? (yp - 0.04) * 85 : 0;
  const catTerm = (cat - 50) * 0.16;
  const riskTerm = (risk - 50) * 0.08;
  const y1 = clamp(locTerm + yieldTerm + catTerm + riskTerm, -25, 35);
  const y3 = clamp((1 + y1 / 100) ** 2.55 * 100 - 100, -40, 70);
  const y5 = clamp((1 + y1 / 100) ** 3.9 * 100 - 100, -50, 110);

  let outlook: FormulaOutlook = "neutral";
  if (y1 >= 4 || intelligence >= 66) outlook = "bullish";
  if (y1 <= -3 || intelligence < 40) outlook = "bearish";

  const factors: PublicFactor[] = [
    {
      key: "location",
      label: "Location momentum",
      score: round(loc),
      direction: directionFromScore(loc),
      note: "City/region score you set; 50 is a flat market.",
    },
    {
      key: "yield",
      label: "Income yield",
      score: round(yld),
      direction: directionFromScore(yld),
      note:
        yp == null
          ? "No rent mark — yield is inferred from occupancy only."
          : `Gross yield about ${(yp * 100).toFixed(1)}%.`,
    },
    {
      key: "catalysts",
      label: "Related projects",
      score: round(cat),
      direction: directionFromScore(cat),
      note: input.catalysts.length
        ? `${input.catalysts.length} side project(s) priced into the outlook.`
        : "No related projects on file — add catalysts to move this factor.",
    },
    {
      key: "risk",
      label: "Carry & condition",
      score: round(risk),
      direction: directionFromScore(risk),
      note: "Taxes, vacancy, HOA, age, and condition.",
    },
    {
      key: "position",
      label: "Book quality",
      score: round(pos),
      direction: directionFromScore(pos),
      note: "Owned vs watching, and how complete the marks are.",
    },
  ];

  return {
    version: FORMULA_VERSION,
    intelligence_score: round(intelligence, 1),
    predicted_delta_pct: { y1: round(y1, 1), y3: round(y3, 1), y5: round(y5, 1) },
    predicted_value: {
      y1: base != null ? round(base * (1 + y1 / 100), 0) : null,
      y3: base != null ? round(base * (1 + y3 / 100), 0) : null,
      y5: base != null ? round(base * (1 + y5 / 100), 0) : null,
    },
    outlook,
    factors,
    catalyst_net: round(cat, 1),
    yield_pct: yp != null ? round(yp * 100, 2) : null,
    base_value: base,
  };
}

export function heuristicNarrative(input: {
  name: string;
  city?: string | null;
  status: string;
  result: FormulaResult;
  liftNames: string[];
  pressureNames: string[];
}): string {
  const { result, name, city, status, liftNames, pressureNames } = input;
  const where = city ? ` in ${city}` : "";
  const stance =
    status === "owned"
      ? "This is an owned holding"
      : status === "listed"
        ? "This listing is on the market"
        : "This is a watchlist / pipeline property";
  const outlookLine =
    result.outlook === "bullish"
      ? `The Domzop Formula (${result.version}) is bullish: intelligence ${result.intelligence_score}/100 with a ${result.predicted_delta_pct.y1}% one-year mark path.`
      : result.outlook === "bearish"
        ? `The Domzop Formula (${result.version}) is cautious: intelligence ${result.intelligence_score}/100 with a ${result.predicted_delta_pct.y1}% one-year mark path.`
        : `The Domzop Formula (${result.version}) is mixed-to-neutral: intelligence ${result.intelligence_score}/100 with a ${result.predicted_delta_pct.y1}% one-year mark path.`;

  const past =
    result.base_value != null
      ? `Present estimate sits near ${Math.round(result.base_value).toLocaleString("en-US")} (currency as booked).`
      : "Present value is still unpriced — add an estimate to anchor the path.";
  const future = `Projected marks: 1y ${result.predicted_delta_pct.y1}%, 3y ${result.predicted_delta_pct.y3}%, 5y ${result.predicted_delta_pct.y5}%. These are formula paths, not appraisals.`;
  const cats =
    liftNames.length || pressureNames.length
      ? `Projects that may lift value: ${liftNames.join(", ") || "none listed"}. Projects that may pressure value: ${pressureNames.join(", ") || "none listed"}.`
      : "No related side projects are attached yet; catalysts are the main way nearby developments enter the score.";

  return `${stance}${where}: ${name}. ${outlookLine} ${past} ${future} ${cats}`;
}
