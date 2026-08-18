/** Deep intelligence types — news aggregator, rate history, projections, stakeholders */

export type NewsCategory =
  | "area"
  | "property"
  | "builder"
  | "proprietor"
  | "policy"
  | "geopolitics"
  | "market"
  | "infrastructure"
  | "environment";

export type NewsSentiment = "positive" | "negative" | "neutral" | "mixed";

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  category: NewsCategory;
  sentiment: NewsSentiment;
  impact_score: number; // -100..100
  confidence: number;
  source: string;
  published_at: string;
  tags: string[];
  entities: string[];
  region?: string;
  why_it_matters: string;
}

export interface RateHistoryPoint {
  date: string;
  price_psf: number;
  median_sale: number;
  rent_psf: number | null;
  days_on_market: number | null;
  inventory: number | null;
  source: string;
}

export interface ProjectionScenario {
  key: "base" | "bull" | "bear";
  label: string;
  y1: number;
  y3: number;
  y5: number;
  probability: number;
  drivers: string[];
}

export interface FormulaStep {
  name: string;
  input: string;
  weight: number;
  contribution: number;
  direction: "tailwind" | "headwind" | "neutral";
  detail: string;
}

export interface StakeholderProfile {
  role: "builder" | "proprietor" | "developer" | "lender" | "municipality";
  name: string;
  reputation: number;
  track_record: string;
  risk_flags: string[];
  recent_activity: string;
}

export interface RelatedProjectDeep {
  id: string;
  name: string;
  category: string;
  status: string;
  impact_direction: "positive" | "negative";
  impact_weight: number;
  confidence: number;
  horizon: string;
  distance_km?: number;
  description: string;
  value_mechanism: string;
  timeline: string;
  sources: string[];
}

export interface DeepPropertyIntelligence {
  asset_id: string;
  headline: string;
  thesis: string;
  risk_summary: string;
  opportunity_summary: string;
  news: NewsItem[];
  rate_history: RateHistoryPoint[];
  projections: ProjectionScenario[];
  formula_steps: FormulaStep[];
  formula_version: string;
  stakeholders: StakeholderProfile[];
  related_projects: RelatedProjectDeep[];
  comps: Array<{
    name: string;
    distance_km: number;
    price: number;
    price_psf: number;
    sold_at: string;
  }>;
  geopolitics: Array<{
    title: string;
    impact: NewsSentiment;
    severity: number;
    note: string;
  }>;
  policy_watch: Array<{
    title: string;
    status: string;
    impact: NewsSentiment;
    note: string;
  }>;
}

export interface DeepDomainIntelligence {
  candidate_id: string;
  domain: string;
  headline: string;
  thesis: string;
  keywords: string[];
  category: string;
  news: NewsItem[];
  traffic_proxy: Array<{ month: string; score: number }>;
  competitors: Array<{ domain: string; strength: number; note: string }>;
  brandability: number;
  availability_notes: string;
  risk_flags: string[];
  opportunity_score: number;
  formula_steps: FormulaStep[];
  projections: Array<{ horizon: string; narrative: string; score: number }>;
}
