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
