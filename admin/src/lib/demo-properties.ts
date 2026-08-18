import type {
  IntelligenceOutlook,
  PortfolioAsset,
  PropertyCard,
  PropertyCatalyst,
} from "@/lib/portfolio-types";
import { resolveCoords } from "@/lib/geo";

function asset(
  id: string,
  name: string,
  country: string,
  city: string,
  address: string,
  value: number,
  image: string,
  type: "residential" | "commercial" | "land" | "mixed",
  extras: Partial<NonNullable<PortfolioAsset["real_estate"]>> = {},
): PortfolioAsset {
  const coords = resolveCoords(country, city);
  return {
    id,
    asset_type: "real_estate",
    name,
    status: "watchlist",
    acquisition_cost: value * 0.92,
    current_value: value,
    currency: "USD",
    acquired_at: null,
    sold_at: null,
    notes: null,
    candidate_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    domain: null,
    real_estate: {
      address,
      city,
      region: null,
      country,
      postal_code: null,
      property_type: type,
      bedrooms: extras.bedrooms ?? 3,
      bathrooms: extras.bathrooms ?? 2,
      square_feet: extras.square_feet ?? 1800,
      square_meters: null,
      lot_size: null,
      year_built: extras.year_built ?? 2018,
      occupancy: extras.occupancy ?? "vacant",
      monthly_rent: extras.monthly_rent ?? Math.round(value * 0.004),
      annual_taxes: extras.annual_taxes ?? Math.round(value * 0.01),
      hoa_fees: null,
      listing_url: null,
      image_url: image,
      location_momentum: extras.location_momentum ?? 62,
      condition_score: extras.condition_score ?? 70,
      market_notes: extras.market_notes ?? null,
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
    },
  };
}

const IMAGES = {
  ny: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80",
  miami: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
  dubai: "https://images.unsplash.com/photo-1512453979798-5ea933d7d5c5?w=800&q=80",
  london: "https://images.unsplash.com/photo-1486299267070-83823f5448dd?w=800&q=80",
  karachi: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
  lahore: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
  austin: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cd00?w=800&q=80",
  toronto: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
};

export const DEMO_PROPERTIES: PropertyCard[] = [
  {
    asset: asset(
      "demo-ny-1",
      "Hudson River Loft",
      "United States",
      "New York",
      "220 Riverside Blvd",
      1850000,
      IMAGES.ny,
      "residential",
      { bedrooms: 2, bathrooms: 2, square_feet: 1400, location_momentum: 78 },
    ),
    intelligence_score: 81,
    outlook: "bullish",
    predicted_delta_pct: 6.4,
    formula_version: "domzop-re-v1",
  },
  {
    asset: asset(
      "demo-mia-1",
      "Brickell Waterfront Condo",
      "United States",
      "Miami",
      "801 Brickell Bay Dr",
      920000,
      IMAGES.miami,
      "residential",
      { bedrooms: 2, bathrooms: 2, square_feet: 1250, location_momentum: 74 },
    ),
    intelligence_score: 76,
    outlook: "bullish",
    predicted_delta_pct: 5.1,
    formula_version: "domzop-re-v1",
  },
  {
    asset: asset(
      "demo-aus-1",
      "East Austin Mixed Use",
      "United States",
      "Austin",
      "1400 E 6th St",
      2100000,
      IMAGES.austin,
      "mixed",
      { bedrooms: null, bathrooms: null, square_feet: 6200, location_momentum: 71 },
    ),
    intelligence_score: 72,
    outlook: "neutral",
    predicted_delta_pct: 3.2,
    formula_version: "domzop-re-v1",
  },
  {
    asset: asset(
      "demo-dxb-1",
      "Marina Gate Tower",
      "United Arab Emirates",
      "Dubai",
      "Dubai Marina Walk",
      1450000,
      IMAGES.dubai,
      "residential",
      { bedrooms: 3, bathrooms: 3, square_feet: 2100, location_momentum: 80 },
    ),
    intelligence_score: 84,
    outlook: "bullish",
    predicted_delta_pct: 7.8,
    formula_version: "domzop-re-v1",
  },
  {
    asset: asset(
      "demo-lon-1",
      "Shoreditch Workspace",
      "United Kingdom",
      "London",
      "48 Great Eastern St",
      2750000,
      IMAGES.london,
      "commercial",
      { bedrooms: null, bathrooms: 4, square_feet: 4800, location_momentum: 69 },
    ),
    intelligence_score: 68,
    outlook: "neutral",
    predicted_delta_pct: 2.4,
    formula_version: "domzop-re-v1",
  },
  {
    asset: asset(
      "demo-khi-1",
      "Clifton Seaview",
      "Pakistan",
      "Karachi",
      "Block 5, Clifton",
      420000,
      IMAGES.karachi,
      "residential",
      { bedrooms: 4, bathrooms: 4, square_feet: 3200, location_momentum: 58 },
    ),
    intelligence_score: 64,
    outlook: "neutral",
    predicted_delta_pct: 4.0,
    formula_version: "domzop-re-v1",
  },
  {
    asset: asset(
      "demo-lhe-1",
      "DHA Phase 6 Villa",
      "Pakistan",
      "Lahore",
      "Street 12, DHA Phase 6",
      380000,
      IMAGES.lahore,
      "residential",
      { bedrooms: 5, bathrooms: 5, square_feet: 4500, location_momentum: 61 },
    ),
    intelligence_score: 70,
    outlook: "bullish",
    predicted_delta_pct: 5.5,
    formula_version: "domzop-re-v1",
  },
  {
    asset: asset(
      "demo-tor-1",
      "King West Loft",
      "Canada",
      "Toronto",
      "560 King St W",
      980000,
      IMAGES.toronto,
      "residential",
      { bedrooms: 1, bathrooms: 1, square_feet: 780, location_momentum: 66 },
    ),
    intelligence_score: 67,
    outlook: "neutral",
    predicted_delta_pct: 2.9,
    formula_version: "domzop-re-v1",
  },
];

export function isDemoId(id: string): boolean {
  return id.startsWith("demo-");
}

export function getDemoProperty(id: string): PropertyCard | undefined {
  return DEMO_PROPERTIES.find((p) => p.asset.id === id);
}

export function filterDemoProperties(opts: {
  country?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
}): PropertyCard[] {
  return DEMO_PROPERTIES.filter((p) => {
    const re = p.asset.real_estate;
    if (!re) return false;
    if (opts.country && re.country?.toLowerCase() !== opts.country.toLowerCase()) return false;
    if (opts.city && re.city?.toLowerCase() !== opts.city.toLowerCase()) return false;
    const price = p.asset.current_value ?? p.asset.acquisition_cost ?? 0;
    if (opts.minPrice != null && price < opts.minPrice) return false;
    if (opts.maxPrice != null && price > opts.maxPrice) return false;
    return true;
  });
}

export function demoCatalysts(assetId: string): PropertyCatalyst[] {
  return [
    {
      id: `${assetId}-c1`,
      asset_id: assetId,
      name: "Transit extension",
      description: "Planned metro / BRT link within 1.5 km",
      category: "transit",
      status: "proposed",
      impact_direction: "positive",
      impact_weight: 55,
      confidence: 62,
      horizon: "mid",
      estimated_start: null,
      estimated_completion: null,
      source_url: null,
      notes: null,
      origin: "demo",
      created_at: new Date().toISOString(),
    },
    {
      id: `${assetId}-c2`,
      asset_id: assetId,
      name: "Competing supply tower",
      description: "New residential inventory entering the submarket",
      category: "competing_supply",
      status: "underway",
      impact_direction: "negative",
      impact_weight: 35,
      confidence: 70,
      horizon: "near",
      estimated_start: null,
      estimated_completion: null,
      source_url: null,
      notes: null,
      origin: "demo",
      created_at: new Date().toISOString(),
    },
    {
      id: `${assetId}-c3`,
      asset_id: assetId,
      name: "Waterfront promenade",
      description: "Amenity upgrade supporting foot traffic and rents",
      category: "amenities",
      status: "proposed",
      impact_direction: "positive",
      impact_weight: 40,
      confidence: 55,
      horizon: "long",
      estimated_start: null,
      estimated_completion: null,
      source_url: null,
      notes: null,
      origin: "demo",
      created_at: new Date().toISOString(),
    },
  ];
}

export function demoIntelligence(card: PropertyCard) {
  const value = card.asset.current_value ?? 0;
  const catalysts = demoCatalysts(card.asset.id);
  const outlook = (card.outlook ?? "neutral") as IntelligenceOutlook;
  const score = card.intelligence_score ?? 65;
  const d1 = card.predicted_delta_pct ?? 3;
  return {
    asset: card.asset,
    snapshot: {
      id: `snap-${card.asset.id}`,
      asset_id: card.asset.id,
      formula_version: "domzop-re-v1",
      intelligence_score: score,
      predicted_delta_pct: d1,
      predicted_value_1y: value * (1 + d1 / 100),
      predicted_value_3y: value * (1 + (d1 * 2.4) / 100),
      predicted_value_5y: value * (1 + (d1 * 3.6) / 100),
      outlook,
      narrative: `${card.asset.name} sits in ${card.asset.real_estate?.city}. Domzop Formula scores location momentum, yield potential, and nearby projects. Related transit and amenity work may lift marks; competing supply can pressure near-term pricing. This is an internal model — not an appraisal.`,
      factors: [
        {
          key: "location",
          label: "Location momentum",
          score: card.asset.real_estate?.location_momentum ?? 60,
          direction: "tailwind",
          note: "City / submarket momentum input",
        },
        {
          key: "yield",
          label: "Income yield",
          score: 58,
          direction: "neutral",
          note: "Rent relative to mark",
        },
        {
          key: "catalysts",
          label: "Related projects",
          score: 66,
          direction: "tailwind",
          note: "Net lift from signed catalysts",
        },
        {
          key: "risk",
          label: "Carry & condition",
          score: 54,
          direction: "neutral",
          note: "Taxes, vacancy, condition",
        },
      ],
      past_json: {
        events: [
          { at: "2024-01-15", label: "Estimate", value: value * 0.9 },
          { at: "2025-06-01", label: "Mark", value: value * 0.96 },
        ],
      },
      present_json: {
        estimate: value,
        occupancy: card.asset.real_estate?.occupancy,
        yield_pct: 4.8,
        location_momentum: card.asset.real_estate?.location_momentum,
        condition_score: card.asset.real_estate?.condition_score,
      },
      future_json: { outlook },
      generated_at: new Date().toISOString(),
    },
    result: {
      predicted_delta_pct: { y1: d1, y3: d1 * 2.4, y5: d1 * 3.6 },
      predicted_value: {
        y1: value * (1 + d1 / 100),
        y3: value * (1 + (d1 * 2.4) / 100),
        y5: value * (1 + (d1 * 3.6) / 100),
      },
      yield_pct: 4.8,
      version: "domzop-re-v1",
    },
    catalysts,
    valuations: [],
  };
}
