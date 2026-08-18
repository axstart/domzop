import { getPool, isDatabaseConfigured } from "@/lib/db";
import {
  computeDomzopFormula,
  FORMULA_VERSION,
  heuristicNarrative,
  type CatalystFactor,
  type FormulaResult,
} from "@/lib/domzop-formula";
import { toNumber } from "@/lib/money";
import { getAsset, listAssets, listValuations } from "@/lib/portfolio";
import type {
  IntelligenceOutlook,
  IntelligenceSnapshot,
  PortfolioAsset,
  PropertyCard,
  PropertyCatalyst,
  Valuation,
} from "@/lib/portfolio-types";

function iso(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function dateOnly(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

export function mapCatalyst(row: Record<string, unknown>): PropertyCatalyst {
  return {
    id: String(row.id),
    asset_id: String(row.asset_id),
    name: String(row.name),
    description: (row.description as string) ?? null,
    category: row.category as PropertyCatalyst["category"],
    status: row.status as PropertyCatalyst["status"],
    impact_direction: row.impact_direction as PropertyCatalyst["impact_direction"],
    impact_weight: toNumber(row.impact_weight) ?? 0,
    confidence: toNumber(row.confidence) ?? 50,
    horizon: row.horizon as PropertyCatalyst["horizon"],
    estimated_start: dateOnly(row.estimated_start),
    estimated_completion: dateOnly(row.estimated_completion),
    source_url: (row.source_url as string) ?? null,
    notes: (row.notes as string) ?? null,
    origin: String(row.origin ?? "manual"),
    created_at: iso(row.created_at) ?? new Date().toISOString(),
  };
}

export async function listCatalysts(assetId: string): Promise<PropertyCatalyst[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    const { rows } = await getPool().query(
      `SELECT * FROM property_catalysts WHERE asset_id = $1 ORDER BY created_at DESC`,
      [assetId],
    );
    return rows.map((row) => mapCatalyst(row as Record<string, unknown>));
  } catch (error) {
    console.error("property_catalysts unavailable", error);
    return [];
  }
}

export async function createCatalyst(
  assetId: string,
  input: Partial<PropertyCatalyst> & { name: string },
): Promise<PropertyCatalyst> {
  if (!isDatabaseConfigured()) throw new Error("DATABASE_URL is not configured");
  const { rows } = await getPool().query(
    `INSERT INTO property_catalysts (
       asset_id, name, description, category, status, impact_direction,
       impact_weight, confidence, horizon, estimated_start, estimated_completion,
       source_url, notes, origin
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      assetId,
      input.name.trim(),
      input.description ?? null,
      input.category ?? "other",
      input.status ?? "proposed",
      input.impact_direction ?? "positive",
      input.impact_weight ?? 0,
      input.confidence ?? 50,
      input.horizon ?? "mid",
      input.estimated_start ?? null,
      input.estimated_completion ?? null,
      input.source_url ?? null,
      input.notes ?? null,
      input.origin ?? "manual",
    ],
  );
  return mapCatalyst(rows[0] as Record<string, unknown>);
}

export async function updateCatalyst(
  id: string,
  patch: Record<string, unknown>,
): Promise<PropertyCatalyst | null> {
  if (!isDatabaseConfigured()) return null;
  const allowed = new Set([
    "name",
    "description",
    "category",
    "status",
    "impact_direction",
    "impact_weight",
    "confidence",
    "horizon",
    "estimated_start",
    "estimated_completion",
    "source_url",
    "notes",
  ]);
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [key, value] of Object.entries(patch)) {
    if (!allowed.has(key) || value === undefined) continue;
    fields.push(`${key} = $${i++}`);
    values.push(value === "" ? null : value);
  }
  if (!fields.length) {
    const { rows } = await getPool().query(`SELECT * FROM property_catalysts WHERE id = $1`, [id]);
    return rows[0] ? mapCatalyst(rows[0] as Record<string, unknown>) : null;
  }
  values.push(id);
  const { rows } = await getPool().query(
    `UPDATE property_catalysts SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
    values,
  );
  return rows[0] ? mapCatalyst(rows[0] as Record<string, unknown>) : null;
}

export async function deleteCatalyst(id: string): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  const { rowCount } = await getPool().query(`DELETE FROM property_catalysts WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}

export async function getLatestSnapshot(assetId: string): Promise<IntelligenceSnapshot | null> {
  if (!isDatabaseConfigured()) return null;
  try {
    const { rows } = await getPool().query(
      `SELECT * FROM property_intelligence_snapshots
       WHERE asset_id = $1 ORDER BY generated_at DESC LIMIT 1`,
      [assetId],
    );
    return rows[0] ? mapSnapshot(rows[0] as Record<string, unknown>) : null;
  } catch (error) {
    console.error("intelligence snapshots unavailable", error);
    return null;
  }
}

function mapSnapshot(row: Record<string, unknown>): IntelligenceSnapshot {
  return {
    id: String(row.id),
    asset_id: String(row.asset_id),
    formula_version: String(row.formula_version),
    intelligence_score: toNumber(row.intelligence_score) ?? 0,
    predicted_delta_pct: toNumber(row.predicted_delta_pct) ?? 0,
    predicted_value_1y: toNumber(row.predicted_value_1y),
    predicted_value_3y: toNumber(row.predicted_value_3y),
    predicted_value_5y: toNumber(row.predicted_value_5y),
    outlook: row.outlook as IntelligenceOutlook,
    narrative: (row.narrative as string) ?? null,
    factors: row.factors,
    past_json: (row.past_json as Record<string, unknown>) ?? {},
    present_json: (row.present_json as Record<string, unknown>) ?? {},
    future_json: (row.future_json as Record<string, unknown>) ?? {},
    generated_at: iso(row.generated_at) ?? new Date().toISOString(),
  };
}

export async function listAvailableProperties(opts?: {
  includeOwned?: boolean;
  status?: string;
}): Promise<PropertyCard[]> {
  if (!isDatabaseConfigured()) return [];
  const statuses = new Set(
    opts?.status
      ? [opts.status]
      : opts?.includeOwned
        ? ["watchlist", "listed", "owned"]
        : ["watchlist", "listed"],
  );
  const assets = (await listAssets({ asset_type: "real_estate" })).filter((a) =>
    statuses.has(a.status),
  );
  if (!assets.length) return [];

  const ids = assets.map((a) => a.id);
  const pool = getPool();
  let snapRows: Record<string, unknown>[] = [];
  let catRows: Record<string, unknown>[] = [];
  let valRows: { asset_id: unknown; cnt: unknown }[] = [];
  try {
    const results = await Promise.all([
      pool.query(
        `SELECT DISTINCT ON (asset_id) *
         FROM property_intelligence_snapshots
         WHERE asset_id = ANY($1::uuid[])
         ORDER BY asset_id, generated_at DESC`,
        [ids],
      ),
      pool.query(`SELECT * FROM property_catalysts WHERE asset_id = ANY($1::uuid[])`, [ids]),
      pool.query(
        `SELECT asset_id, COUNT(*)::int AS cnt FROM valuations WHERE asset_id = ANY($1::uuid[]) GROUP BY asset_id`,
        [ids],
      ),
    ]);
    snapRows = results[0].rows as Record<string, unknown>[];
    catRows = results[1].rows as Record<string, unknown>[];
    valRows = results[2].rows as { asset_id: unknown; cnt: unknown }[];
  } catch (error) {
    console.error("intelligence tables unavailable", error);
  }

  const snaps = new Map(
    snapRows.map((row) => [String(row.asset_id), mapSnapshot(row)]),
  );
  const catsByAsset = new Map<string, PropertyCatalyst[]>();
  for (const row of catRows) {
    const c = mapCatalyst(row);
    const list = catsByAsset.get(c.asset_id) ?? [];
    list.push(c);
    catsByAsset.set(c.asset_id, list);
  }
  const valCount = new Map(valRows.map((r) => [String(r.asset_id), Number(r.cnt)]));

  return assets.map((asset) => {
    const snapshot = snaps.get(asset.id);
    if (snapshot) {
      return {
        asset,
        intelligence_score: snapshot.intelligence_score,
        outlook: snapshot.outlook,
        predicted_delta_pct: snapshot.predicted_delta_pct,
        formula_version: snapshot.formula_version,
      };
    }
    const result = formulaFromAsset(
      asset,
      catsByAsset.get(asset.id) ?? [],
      valCount.get(asset.id) ?? 0,
    );
    return {
      asset,
      intelligence_score: result.intelligence_score,
      outlook: result.outlook,
      predicted_delta_pct: result.predicted_delta_pct.y1,
      formula_version: result.version,
    };
  });
}

export function formulaFromAsset(
  asset: PortfolioAsset,
  catalysts: PropertyCatalyst[],
  valuationCount: number,
): FormulaResult {
  const re = asset.real_estate;
  return computeDomzopFormula({
    current_value: asset.current_value,
    acquisition_cost: asset.acquisition_cost,
    monthly_rent: re?.monthly_rent ?? null,
    annual_taxes: re?.annual_taxes ?? null,
    hoa_fees: re?.hoa_fees ?? null,
    occupancy: re?.occupancy ?? null,
    location_momentum: re?.location_momentum ?? 50,
    condition_score: re?.condition_score ?? 60,
    status: asset.status,
    year_built: re?.year_built ?? null,
    valuation_count: valuationCount,
    catalysts: catalysts.map(
      (c): CatalystFactor => ({
        impact_direction: c.impact_direction,
        impact_weight: c.impact_weight,
        confidence: c.confidence,
        horizon: c.horizon,
        status: c.status,
      }),
    ),
  });
}

function buildTimeline(
  asset: PortfolioAsset,
  valuations: Valuation[],
  catalysts: PropertyCatalyst[],
  result: FormulaResult,
) {
  const pastEvents = [
    asset.acquired_at
      ? {
          at: asset.acquired_at,
          label: asset.status === "owned" ? "Acquired" : "First booked",
          value: asset.acquisition_cost,
        }
      : null,
    ...valuations
      .slice()
      .reverse()
      .map((v) => ({
        at: v.valued_at,
        label: `Mark (${v.source})`,
        value: v.value,
        notes: v.notes,
      })),
  ].filter(Boolean);

  const lift = catalysts.filter((c) => c.impact_direction === "positive");
  const pressure = catalysts.filter((c) => c.impact_direction === "negative");

  return {
    past: {
      events: pastEvents,
      notes: asset.notes,
      valuation_count: valuations.length,
    },
    present: {
      estimate: result.base_value,
      occupancy: asset.real_estate?.occupancy ?? null,
      yield_pct: result.yield_pct,
      location_momentum: asset.real_estate?.location_momentum ?? 50,
      condition_score: asset.real_estate?.condition_score ?? 60,
      city: asset.real_estate?.city ?? null,
      region: asset.real_estate?.region ?? null,
      property_type: asset.real_estate?.property_type ?? null,
      monthly_rent: asset.real_estate?.monthly_rent ?? null,
      annual_taxes: asset.real_estate?.annual_taxes ?? null,
      market_notes: asset.real_estate?.market_notes ?? null,
    },
    future: {
      predicted_delta_pct: result.predicted_delta_pct,
      predicted_value: result.predicted_value,
      outlook: result.outlook,
      lift: lift.map((c) => c.name),
      pressure: pressure.map((c) => c.name),
    },
  };
}

async function maybeAiNarrative(heuristic: string, context: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return heuristic;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 420,
        messages: [
          {
            role: "system",
            content:
              "You write concise investor-facing property intelligence. Cover past, present, and future. Mention related projects that may lift or pressure value. Do not claim MLS or appraisal accuracy. Do not mention how domain candidates are discovered. Tone: professional portfolio lab.",
          },
          {
            role: "user",
            content: `${context}\n\nBase notes:\n${heuristic}\n\nWrite 2 short paragraphs plus a one-line outlook.`,
          },
        ],
      }),
    });
    if (!res.ok) return heuristic;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
      return data.choices?.[0]?.message?.content?.trim() || heuristic;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return heuristic;
  }
}

export async function computeAndStoreIntelligence(assetId: string): Promise<{
  asset: PortfolioAsset;
  snapshot: IntelligenceSnapshot;
  result: FormulaResult;
  catalysts: PropertyCatalyst[];
  valuations: Valuation[];
}> {
  if (!isDatabaseConfigured()) throw new Error("DATABASE_URL is not configured");
  const asset = await getAsset(assetId);
  if (!asset || asset.asset_type !== "real_estate") {
    throw new Error("Real estate holding not found");
  }
  const [catalysts, valuations] = await Promise.all([
    listCatalysts(assetId),
    listValuations(assetId),
  ]);
  const result = formulaFromAsset(asset, catalysts, valuations.length);
  const timeline = buildTimeline(asset, valuations, catalysts, result);
  const liftNames = catalysts.filter((c) => c.impact_direction === "positive").map((c) => c.name);
  const pressureNames = catalysts
    .filter((c) => c.impact_direction === "negative")
    .map((c) => c.name);
  const heuristic = heuristicNarrative({
    name: asset.name,
    city: asset.real_estate?.city,
    status: asset.status,
    result,
    liftNames,
    pressureNames,
  });
  const narrative = await maybeAiNarrative(
    heuristic,
    JSON.stringify({
      address: asset.real_estate?.address,
      city: asset.real_estate?.city,
      status: asset.status,
      factors: result.factors,
      outlook: result.outlook,
      catalysts: catalysts.map((c) => ({
        name: c.name,
        direction: c.impact_direction,
        horizon: c.horizon,
        status: c.status,
      })),
    }),
  );

  const { rows } = await getPool().query(
    `INSERT INTO property_intelligence_snapshots (
       asset_id, formula_version, intelligence_score, predicted_delta_pct,
       predicted_value_1y, predicted_value_3y, predicted_value_5y,
       outlook, narrative, factors, past_json, present_json, future_json
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12::jsonb,$13::jsonb)
     RETURNING *`,
    [
      assetId,
      FORMULA_VERSION,
      result.intelligence_score,
      result.predicted_delta_pct.y1,
      result.predicted_value.y1,
      result.predicted_value.y3,
      result.predicted_value.y5,
      result.outlook,
      narrative,
      JSON.stringify(result.factors),
      JSON.stringify(timeline.past),
      JSON.stringify(timeline.present),
      JSON.stringify(timeline.future),
    ],
  );

  return {
    asset,
    snapshot: mapSnapshot(rows[0] as Record<string, unknown>),
    result,
    catalysts,
    valuations,
  };
}

export async function getIntelligence(assetId: string, recompute = false) {
  const asset = await getAsset(assetId);
  if (!asset || asset.asset_type !== "real_estate") return null;
  const [catalysts, valuations] = await Promise.all([
    listCatalysts(assetId),
    listValuations(assetId),
  ]);
  let snapshot = recompute ? null : await getLatestSnapshot(assetId);
  let result = formulaFromAsset(asset, catalysts, valuations.length);
  if (!snapshot || recompute) {
    try {
      const computed = await computeAndStoreIntelligence(assetId);
      snapshot = computed.snapshot;
      result = computed.result;
    } catch (error) {
      console.error("intelligence snapshot store skipped", error);
      const timeline = {
        past: { events: valuations, notes: asset.notes, valuation_count: valuations.length },
        present: {
          estimate: result.base_value,
          occupancy: asset.real_estate?.occupancy ?? null,
          yield_pct: result.yield_pct,
          location_momentum: asset.real_estate?.location_momentum ?? 50,
          condition_score: asset.real_estate?.condition_score ?? 60,
        },
        future: {
          predicted_delta_pct: result.predicted_delta_pct,
          predicted_value: result.predicted_value,
          outlook: result.outlook,
        },
      };
      snapshot = {
        id: "ephemeral",
        asset_id: asset.id,
        formula_version: result.version,
        intelligence_score: result.intelligence_score,
        predicted_delta_pct: result.predicted_delta_pct.y1,
        predicted_value_1y: result.predicted_value.y1,
        predicted_value_3y: result.predicted_value.y3,
        predicted_value_5y: result.predicted_value.y5,
        outlook: result.outlook,
        narrative: heuristicNarrative({
          name: asset.name,
          city: asset.real_estate?.city,
          status: asset.status,
          result,
          liftNames: catalysts.filter((c) => c.impact_direction === "positive").map((c) => c.name),
          pressureNames: catalysts
            .filter((c) => c.impact_direction === "negative")
            .map((c) => c.name),
        }),
        factors: result.factors,
        past_json: timeline.past,
        present_json: timeline.present,
        future_json: timeline.future,
        generated_at: new Date().toISOString(),
      };
    }
  }
  return { asset, snapshot, result, catalysts, valuations };
}
