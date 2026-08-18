import { getPool, isDatabaseConfigured } from "@/lib/db";
import { toNumber } from "@/lib/money";
import type {
  AssetStatus,
  AssetType,
  CreateAssetInput,
  DomainHolding,
  OccupancyType,
  PortfolioAsset,
  PortfolioSummary,
  PropertyType,
  RealEstateHolding,
  Valuation,
  ValuationSource,
} from "@/lib/portfolio-types";

export type {
  AssetStatus,
  AssetType,
  CreateAssetInput,
  CreateDomainInput,
  CreateRealEstateInput,
  DomainHolding,
  OccupancyType,
  PortfolioAsset,
  PortfolioSummary,
  PropertyType,
  RealEstateHolding,
  Valuation,
  ValuationSource,
} from "@/lib/portfolio-types";

const ASSET_SELECT = `
  SELECT
    a.id, a.asset_type, a.name, a.status,
    a.acquisition_cost, a.current_value, a.currency,
    a.acquired_at, a.sold_at, a.notes, a.candidate_id,
    a.created_at, a.updated_at,
    d.domain_name, d.registrar, d.expiry_date, d.auto_renew, d.tld, d.research_score,
    r.address, r.city, r.region, r.country, r.postal_code, r.property_type,
    r.bedrooms, r.bathrooms, r.square_feet, r.square_meters, r.lot_size, r.year_built,
    r.occupancy, r.monthly_rent, r.annual_taxes, r.hoa_fees, r.listing_url, r.image_url,
    r.location_momentum, r.condition_score, r.market_notes
  FROM assets a
  LEFT JOIN domain_holdings d ON d.asset_id = a.id
  LEFT JOIN real_estate_holdings r ON r.asset_id = a.id
`;

function dateOnly(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function iso(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function mapAsset(row: Record<string, unknown>): PortfolioAsset {
  const assetType = row.asset_type as AssetType;
  return {
    id: String(row.id),
    asset_type: assetType,
    name: String(row.name),
    status: row.status as AssetStatus,
    acquisition_cost: toNumber(row.acquisition_cost),
    current_value: toNumber(row.current_value),
    currency: String(row.currency ?? "USD"),
    acquired_at: iso(row.acquired_at),
    sold_at: iso(row.sold_at),
    notes: (row.notes as string) ?? null,
    candidate_id: row.candidate_id ? String(row.candidate_id) : null,
    created_at: iso(row.created_at) ?? new Date().toISOString(),
    updated_at: iso(row.updated_at) ?? new Date().toISOString(),
    domain:
      assetType === "domain" && row.domain_name
        ? {
            domain_name: String(row.domain_name),
            registrar: (row.registrar as string) ?? null,
            expiry_date: dateOnly(row.expiry_date),
            auto_renew: Boolean(row.auto_renew),
            tld: (row.tld as string) ?? null,
            research_score: toNumber(row.research_score),
          }
        : null,
    real_estate:
      assetType === "real_estate" && row.address
        ? {
            address: String(row.address),
            city: (row.city as string) ?? null,
            region: (row.region as string) ?? null,
            country: (row.country as string) ?? null,
            postal_code: (row.postal_code as string) ?? null,
            property_type: (row.property_type as PropertyType) ?? "residential",
            bedrooms: toNumber(row.bedrooms),
            bathrooms: toNumber(row.bathrooms),
            square_feet: toNumber(row.square_feet),
            square_meters: toNumber(row.square_meters),
            lot_size: toNumber(row.lot_size),
            year_built: toNumber(row.year_built),
            occupancy: (row.occupancy as OccupancyType) ?? null,
            monthly_rent: toNumber(row.monthly_rent),
            annual_taxes: toNumber(row.annual_taxes),
            hoa_fees: toNumber(row.hoa_fees),
            listing_url: (row.listing_url as string) ?? null,
            image_url: (row.image_url as string) ?? null,
            location_momentum: toNumber(row.location_momentum) ?? 50,
            condition_score: toNumber(row.condition_score) ?? 60,
            market_notes: (row.market_notes as string) ?? null,
          }
        : null,
  };
}

function emptySummary(): PortfolioSummary {
  return {
    total_cost: 0,
    total_value: 0,
    unrealized_pl: 0,
    domain_count: 0,
    real_estate_count: 0,
    domain_value: 0,
    real_estate_value: 0,
    owned_count: 0,
    listed_count: 0,
    watchlist_count: 0,
    sold_count: 0,
  };
}

export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  if (!isDatabaseConfigured()) return emptySummary();
  const { rows } = await getPool().query(`
    SELECT
      COALESCE(SUM(acquisition_cost) FILTER (WHERE status IN ('owned', 'listed')), 0) AS total_cost,
      COALESCE(SUM(current_value) FILTER (WHERE status IN ('owned', 'listed')), 0) AS total_value,
      COALESCE(SUM(current_value - acquisition_cost) FILTER (
        WHERE status IN ('owned', 'listed')
          AND current_value IS NOT NULL
          AND acquisition_cost IS NOT NULL
      ), 0) AS unrealized_pl,
      COUNT(*) FILTER (WHERE asset_type = 'domain' AND status NOT IN ('discarded', 'sold')) AS domain_count,
      COUNT(*) FILTER (WHERE asset_type = 'real_estate' AND status NOT IN ('discarded', 'sold')) AS real_estate_count,
      COALESCE(SUM(current_value) FILTER (WHERE asset_type = 'domain' AND status IN ('owned', 'listed')), 0) AS domain_value,
      COALESCE(SUM(current_value) FILTER (WHERE asset_type = 'real_estate' AND status IN ('owned', 'listed')), 0) AS real_estate_value,
      COUNT(*) FILTER (WHERE status = 'owned') AS owned_count,
      COUNT(*) FILTER (WHERE status = 'listed') AS listed_count,
      COUNT(*) FILTER (WHERE status = 'watchlist') AS watchlist_count,
      COUNT(*) FILTER (WHERE status = 'sold') AS sold_count
    FROM assets
  `);
  const row = rows[0] ?? {};
  return {
    total_cost: toNumber(row.total_cost) ?? 0,
    total_value: toNumber(row.total_value) ?? 0,
    unrealized_pl: toNumber(row.unrealized_pl) ?? 0,
    domain_count: toNumber(row.domain_count) ?? 0,
    real_estate_count: toNumber(row.real_estate_count) ?? 0,
    domain_value: toNumber(row.domain_value) ?? 0,
    real_estate_value: toNumber(row.real_estate_value) ?? 0,
    owned_count: toNumber(row.owned_count) ?? 0,
    listed_count: toNumber(row.listed_count) ?? 0,
    watchlist_count: toNumber(row.watchlist_count) ?? 0,
    sold_count: toNumber(row.sold_count) ?? 0,
  };
}

export async function listAssets(filters?: {
  asset_type?: AssetType;
  status?: AssetStatus;
}): Promise<PortfolioAsset[]> {
  if (!isDatabaseConfigured()) return [];
  const clauses: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (filters?.asset_type) {
    clauses.push(`a.asset_type = $${i++}`);
    values.push(filters.asset_type);
  }
  if (filters?.status) {
    clauses.push(`a.status = $${i++}`);
    values.push(filters.status);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await getPool().query(
    `${ASSET_SELECT} ${where} ORDER BY a.updated_at DESC LIMIT 500`,
    values,
  );
  return rows.map((row) => mapAsset(row as Record<string, unknown>));
}

export async function getAsset(id: string): Promise<PortfolioAsset | null> {
  if (!isDatabaseConfigured()) return null;
  const { rows } = await getPool().query(`${ASSET_SELECT} WHERE a.id = $1`, [id]);
  return rows[0] ? mapAsset(rows[0] as Record<string, unknown>) : null;
}

export async function listValuations(assetId: string): Promise<Valuation[]> {
  if (!isDatabaseConfigured()) return [];
  const { rows } = await getPool().query(
    `SELECT id, asset_id, valued_at, value, source, notes
     FROM valuations WHERE asset_id = $1 ORDER BY valued_at DESC LIMIT 50`,
    [assetId],
  );
  return rows.map((row) => ({
    id: String(row.id),
    asset_id: String(row.asset_id),
    valued_at: iso(row.valued_at) ?? new Date().toISOString(),
    value: toNumber(row.value) ?? 0,
    source: row.source as ValuationSource,
    notes: (row.notes as string) ?? null,
  }));
}

function tldFromDomain(domain: string): string {
  const parts = domain.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : domain.toLowerCase();
}

export async function createAsset(input: CreateAssetInput): Promise<PortfolioAsset> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured");
  }
  if (input.asset_type === "domain") {
    if (!input.domain?.domain_name?.trim()) {
      throw new Error("domain_name is required");
    }
  } else if (!input.real_estate?.address?.trim()) {
    throw new Error("address is required");
  }

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    let candidateId = input.candidate_id ?? null;
    let domainName: string | null = null;
    if (input.asset_type === "domain" && input.domain) {
      domainName = input.domain.domain_name.trim().toLowerCase();
      if (!candidateId) {
        const { rows } = await client.query(
          `SELECT id FROM candidates WHERE lower(com_domain) = lower($1) LIMIT 1`,
          [domainName],
        );
        candidateId = rows[0] ? String(rows[0].id) : null;
      }
    }

    const name =
      input.name?.trim() ||
      domainName ||
      input.real_estate?.address?.trim() ||
      "Untitled holding";
    const status = input.status ?? "owned";
    const acquiredAt = input.acquired_at || (status === "owned" ? new Date().toISOString() : null);

    const { rows: assetRows } = await client.query(
      `INSERT INTO assets (
         asset_type, name, status, acquisition_cost, current_value, currency,
         acquired_at, notes, candidate_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        input.asset_type,
        name,
        status,
        input.acquisition_cost ?? null,
        input.current_value ?? null,
        input.currency ?? "USD",
        acquiredAt,
        input.notes ?? null,
        candidateId,
      ],
    );
    const id = String(assetRows[0].id);

    if (input.asset_type === "domain" && input.domain && domainName) {
      const tld = input.domain.tld?.trim() || tldFromDomain(domainName);
      await client.query(
        `INSERT INTO domain_holdings (asset_id, domain_name, registrar, expiry_date, auto_renew, tld)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          id,
          domainName,
          input.domain.registrar?.trim() || null,
          input.domain.expiry_date || null,
          Boolean(input.domain.auto_renew),
          tld,
        ],
      );
    }

    if (input.asset_type === "real_estate" && input.real_estate) {
      const re = input.real_estate;
      await client.query(
        `INSERT INTO real_estate_holdings (
           asset_id, address, city, region, country, postal_code, property_type,
           bedrooms, bathrooms, square_feet, square_meters, lot_size, year_built,
           occupancy, monthly_rent, annual_taxes, hoa_fees, listing_url, image_url,
           location_momentum, condition_score, market_notes
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
        [
          id,
          re.address.trim(),
          re.city?.trim() || null,
          re.region?.trim() || null,
          re.country?.trim() || null,
          re.postal_code?.trim() || null,
          re.property_type ?? "residential",
          re.bedrooms ?? null,
          re.bathrooms ?? null,
          re.square_feet ?? null,
          re.square_meters ?? null,
          re.lot_size ?? null,
          re.year_built ?? null,
          re.occupancy ?? null,
          re.monthly_rent ?? null,
          re.annual_taxes ?? null,
          re.hoa_fees ?? null,
          re.listing_url?.trim() || null,
          re.image_url?.trim() || null,
          re.location_momentum ?? 50,
          re.condition_score ?? 60,
          re.market_notes?.trim() || null,
        ],
      );
    }

    if (input.current_value != null) {
      await client.query(
        `INSERT INTO valuations (asset_id, value, source, notes)
         VALUES ($1, $2, 'manual', 'Initial mark')`,
        [id, input.current_value],
      );
    }

    await client.query("COMMIT");
    const created = await getAsset(id);
    if (!created) throw new Error("Failed to load created holding");
    return created;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

const ASSET_PATCH_FIELDS = new Set([
  "name",
  "status",
  "acquisition_cost",
  "current_value",
  "currency",
  "acquired_at",
  "sold_at",
  "notes",
  "candidate_id",
]);

const DOMAIN_PATCH_FIELDS = new Set([
  "domain_name",
  "registrar",
  "expiry_date",
  "auto_renew",
  "tld",
  "research_score",
]);

const RE_PATCH_FIELDS = new Set([
  "address",
  "city",
  "region",
  "country",
  "postal_code",
  "property_type",
  "bedrooms",
  "bathrooms",
  "square_feet",
  "square_meters",
  "lot_size",
  "year_built",
  "occupancy",
  "monthly_rent",
  "annual_taxes",
  "hoa_fees",
  "listing_url",
  "image_url",
  "location_momentum",
  "condition_score",
  "market_notes",
]);

export async function updateAsset(
  id: string,
  patch: Record<string, unknown>,
): Promise<PortfolioAsset | null> {
  if (!isDatabaseConfigured()) return null;
  const existing = await getAsset(id);
  if (!existing) return null;

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    const assetUpdates: string[] = [];
    const assetValues: unknown[] = [];
    let i = 1;
    for (const [key, value] of Object.entries(patch)) {
      if (!ASSET_PATCH_FIELDS.has(key) || value === undefined) continue;
      assetUpdates.push(`${key} = $${i++}`);
      assetValues.push(value === "" ? null : value);
    }
    if (patch.status === "sold" && !patch.sold_at && !existing.sold_at) {
      assetUpdates.push(`sold_at = $${i++}`);
      assetValues.push(new Date().toISOString());
    }
    if (assetUpdates.length) {
      assetValues.push(id);
      await client.query(
        `UPDATE assets SET ${assetUpdates.join(", ")} WHERE id = $${i}`,
        assetValues,
      );
    }

    if (existing.asset_type === "domain" && patch.domain && typeof patch.domain === "object") {
      const domain = patch.domain as Record<string, unknown>;
      const fields: string[] = [];
      const values: unknown[] = [];
      let j = 1;
      for (const [key, value] of Object.entries(domain)) {
        if (!DOMAIN_PATCH_FIELDS.has(key) || value === undefined) continue;
        fields.push(`${key} = $${j++}`);
        values.push(value === "" ? null : value);
      }
      if (fields.length) {
        values.push(id);
        await client.query(
          `UPDATE domain_holdings SET ${fields.join(", ")} WHERE asset_id = $${j}`,
          values,
        );
      }
    }

    if (
      existing.asset_type === "real_estate" &&
      patch.real_estate &&
      typeof patch.real_estate === "object"
    ) {
      const re = patch.real_estate as Record<string, unknown>;
      const fields: string[] = [];
      const values: unknown[] = [];
      let j = 1;
      for (const [key, value] of Object.entries(re)) {
        if (!RE_PATCH_FIELDS.has(key) || value === undefined) continue;
        fields.push(`${key} = $${j++}`);
        values.push(value === "" ? null : value);
      }
      if (fields.length) {
        values.push(id);
        await client.query(
          `UPDATE real_estate_holdings SET ${fields.join(", ")} WHERE asset_id = $${j}`,
          values,
        );
      }
    }

    if (
      patch.current_value != null &&
      toNumber(patch.current_value) !== existing.current_value
    ) {
      await client.query(
        `INSERT INTO valuations (asset_id, value, source, notes)
         VALUES ($1, $2, 'manual', 'Updated mark')`,
        [id, patch.current_value],
      );
    }

    await client.query("COMMIT");
    return getAsset(id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteAsset(id: string): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  const { rowCount } = await getPool().query(`DELETE FROM assets WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}

export async function addValuation(
  assetId: string,
  input: { value: number; source?: ValuationSource; notes?: string | null; valued_at?: string | null },
): Promise<Valuation> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured");
  }
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `INSERT INTO valuations (asset_id, value, source, notes, valued_at)
       VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, NOW()))
       RETURNING id, asset_id, valued_at, value, source, notes`,
      [
        assetId,
        input.value,
        input.source ?? "manual",
        input.notes ?? null,
        input.valued_at ?? null,
      ],
    );
    await client.query(`UPDATE assets SET current_value = $1 WHERE id = $2`, [
      input.value,
      assetId,
    ]);
    await client.query("COMMIT");
    const row = rows[0];
    return {
      id: String(row.id),
      asset_id: String(row.asset_id),
      valued_at: iso(row.valued_at) ?? new Date().toISOString(),
      value: toNumber(row.value) ?? input.value,
      source: row.source as ValuationSource,
      notes: (row.notes as string) ?? null,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function upsertDomainAssetFromCandidate(candidateId: string): Promise<string | null> {
  if (!isDatabaseConfigured()) return null;
  const { rows } = await getPool().query(`SELECT upsert_domain_asset_from_candidate($1) AS id`, [
    candidateId,
  ]);
  return rows[0]?.id ? String(rows[0].id) : null;
}
