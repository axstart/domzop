export type AssetType = "domain" | "real_estate";
export type AssetStatus = "watchlist" | "owned" | "listed" | "sold" | "discarded";
export type PropertyType = "residential" | "commercial" | "land" | "mixed" | "other";
export type OccupancyType = "vacant" | "owner" | "rented";
export type ValuationSource = "manual" | "appraisal" | "estimate";

export interface DomainHolding {
  domain_name: string;
  registrar: string | null;
  expiry_date: string | null;
  auto_renew: boolean;
  tld: string | null;
  research_score: number | null;
}

export interface RealEstateHolding {
  address: string;
  city: string | null;
  region: string | null;
  country: string | null;
  postal_code: string | null;
  property_type: PropertyType;
  bedrooms: number | null;
  bathrooms: number | null;
  square_feet: number | null;
  square_meters: number | null;
  lot_size: number | null;
  year_built: number | null;
  occupancy: OccupancyType | null;
  monthly_rent: number | null;
  annual_taxes: number | null;
  hoa_fees: number | null;
  listing_url: string | null;
  image_url: string | null;
  location_momentum: number | null;
  condition_score: number | null;
  market_notes: string | null;
}

export interface Valuation {
  id: string;
  asset_id: string;
  valued_at: string;
  value: number;
  source: ValuationSource;
  notes: string | null;
}

export interface PortfolioAsset {
  id: string;
  asset_type: AssetType;
  name: string;
  status: AssetStatus;
  acquisition_cost: number | null;
  current_value: number | null;
  currency: string;
  acquired_at: string | null;
  sold_at: string | null;
  notes: string | null;
  candidate_id: string | null;
  created_at: string;
  updated_at: string;
  domain: DomainHolding | null;
  real_estate: RealEstateHolding | null;
}

export interface PortfolioSummary {
  total_cost: number;
  total_value: number;
  unrealized_pl: number;
  domain_count: number;
  real_estate_count: number;
  domain_value: number;
  real_estate_value: number;
  owned_count: number;
  listed_count: number;
  watchlist_count: number;
  sold_count: number;
}

export interface CreateDomainInput {
  domain_name: string;
  registrar?: string | null;
  expiry_date?: string | null;
  auto_renew?: boolean;
  tld?: string | null;
}

export interface CreateRealEstateInput {
  address: string;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  postal_code?: string | null;
  property_type?: PropertyType;
  bedrooms?: number | null;
  bathrooms?: number | null;
  square_feet?: number | null;
  square_meters?: number | null;
  lot_size?: number | null;
  year_built?: number | null;
  occupancy?: OccupancyType | null;
  monthly_rent?: number | null;
  annual_taxes?: number | null;
  hoa_fees?: number | null;
  listing_url?: string | null;
  image_url?: string | null;
  location_momentum?: number | null;
  condition_score?: number | null;
  market_notes?: string | null;
}

export interface CreateAssetInput {
  asset_type: AssetType;
  name?: string;
  status?: AssetStatus;
  acquisition_cost?: number | null;
  current_value?: number | null;
  currency?: string;
  acquired_at?: string | null;
  notes?: string | null;
  candidate_id?: string | null;
  domain?: CreateDomainInput;
  real_estate?: CreateRealEstateInput;
}

export type CatalystCategory =
  | "infra"
  | "commercial"
  | "residential"
  | "zoning"
  | "transit"
  | "competing_supply"
  | "amenities"
  | "environmental"
  | "policy"
  | "other";

export type CatalystStatus = "proposed" | "underway" | "completed" | "rumored";
export type CatalystDirection = "positive" | "negative";
export type CatalystHorizon = "near" | "mid" | "long";
export type IntelligenceOutlook = "bullish" | "neutral" | "bearish";

export interface PropertyCatalyst {
  id: string;
  asset_id: string;
  name: string;
  description: string | null;
  category: CatalystCategory;
  status: CatalystStatus;
  impact_direction: CatalystDirection;
  impact_weight: number;
  confidence: number;
  horizon: CatalystHorizon;
  estimated_start: string | null;
  estimated_completion: string | null;
  source_url: string | null;
  notes: string | null;
  origin: string;
  created_at: string;
}

export interface IntelligenceSnapshot {
  id: string;
  asset_id: string;
  formula_version: string;
  intelligence_score: number;
  predicted_delta_pct: number;
  predicted_value_1y: number | null;
  predicted_value_3y: number | null;
  predicted_value_5y: number | null;
  outlook: IntelligenceOutlook;
  narrative: string | null;
  factors: unknown;
  past_json: Record<string, unknown>;
  present_json: Record<string, unknown>;
  future_json: Record<string, unknown>;
  generated_at: string;
}

export interface PropertyCard {
  asset: PortfolioAsset;
  intelligence_score: number | null;
  outlook: IntelligenceOutlook | null;
  predicted_delta_pct: number | null;
  formula_version: string | null;
}
