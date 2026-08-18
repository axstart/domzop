import { buildDeepPropertyIntelligence } from "@/lib/deep-intelligence";
import { resolveCoords } from "@/lib/geo";
import type {
  IntelligenceOutlook,
  PortfolioAsset,
  PropertyCard,
  PropertyCatalyst,
} from "@/lib/portfolio-types";

const IMAGES = [
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
  "https://images.unsplash.com/photo-1512453979798-5ea933d7d5c5?w=800&q=80",
  "https://images.unsplash.com/photo-1486299267070-83823f5448dd?w=800&q=80",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
  "https://images.unsplash.com/photo-1600047509807-ba8f99d2cd00?w=800&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80",
  "https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=800&q=80",
  "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80",
];

type Spec = {
  id: string;
  name: string;
  country: string;
  city: string;
  address: string;
  value: number;
  type: "residential" | "commercial" | "land" | "mixed";
  score: number;
  outlook: IntelligenceOutlook;
  delta: number;
  beds?: number | null;
  baths?: number | null;
  sqft?: number;
  momentum?: number;
};

const SPECS: Spec[] = [
  { id: "demo-ny-1", name: "Hudson River Loft", country: "United States", city: "New York", address: "220 Riverside Blvd", value: 1850000, type: "residential", score: 81, outlook: "bullish", delta: 6.4, beds: 2, baths: 2, sqft: 1400, momentum: 78 },
  { id: "demo-ny-2", name: "SoHo Cast-Iron Studio", country: "United States", city: "New York", address: "41 Greene St", value: 2400000, type: "residential", score: 79, outlook: "bullish", delta: 5.8, beds: 1, baths: 1, sqft: 1100, momentum: 80 },
  { id: "demo-ny-3", name: "Midtown Flex Office", country: "United States", city: "New York", address: "350 5th Ave", value: 6200000, type: "commercial", score: 61, outlook: "neutral", delta: 1.4, beds: null, baths: 6, sqft: 12000, momentum: 55 },
  { id: "demo-mia-1", name: "Brickell Waterfront Condo", country: "United States", city: "Miami", address: "801 Brickell Bay Dr", value: 920000, type: "residential", score: 76, outlook: "bullish", delta: 5.1, beds: 2, baths: 2, sqft: 1250, momentum: 74 },
  { id: "demo-mia-2", name: "Wynwood Creative Warehouse", country: "United States", city: "Miami", address: "2300 NW 2nd Ave", value: 3100000, type: "mixed", score: 73, outlook: "bullish", delta: 4.6, beds: null, baths: 4, sqft: 9000, momentum: 72 },
  { id: "demo-la-1", name: "Silver Lake Hills Residence", country: "United States", city: "Los Angeles", address: "2211 Micheltorena St", value: 1680000, type: "residential", score: 74, outlook: "bullish", delta: 4.2, beds: 3, baths: 3, sqft: 2100, momentum: 70 },
  { id: "demo-la-2", name: "Santa Monica Retail Strip", country: "United States", city: "Los Angeles", address: "1400 3rd Street Promenade", value: 4500000, type: "commercial", score: 58, outlook: "bearish", delta: -1.2, beds: null, baths: 4, sqft: 6500, momentum: 48 },
  { id: "demo-aus-1", name: "East Austin Mixed Use", country: "United States", city: "Austin", address: "1400 E 6th St", value: 2100000, type: "mixed", score: 72, outlook: "neutral", delta: 3.2, beds: null, baths: null, sqft: 6200, momentum: 71 },
  { id: "demo-aus-2", name: "Domain Northside Flat", country: "United States", city: "Austin", address: "11801 Domain Blvd", value: 540000, type: "residential", score: 69, outlook: "neutral", delta: 2.8, beds: 2, baths: 2, sqft: 980, momentum: 64 },
  { id: "demo-chi-1", name: "River North Condo", country: "United States", city: "Chicago", address: "600 N Fairbanks Ct", value: 710000, type: "residential", score: 66, outlook: "neutral", delta: 2.1, beds: 2, baths: 2, sqft: 1150, momentum: 60 },
  { id: "demo-dxb-1", name: "Marina Gate Tower", country: "United Arab Emirates", city: "Dubai", address: "Dubai Marina Walk", value: 1450000, type: "residential", score: 84, outlook: "bullish", delta: 7.8, beds: 3, baths: 3, sqft: 2100, momentum: 80 },
  { id: "demo-dxb-2", name: "Business Bay Office Floor", country: "United Arab Emirates", city: "Dubai", address: "Bay Square Building 7", value: 2800000, type: "commercial", score: 71, outlook: "bullish", delta: 4.9, beds: null, baths: 8, sqft: 8500, momentum: 68 },
  { id: "demo-auh-1", name: "Al Reem Island Apartment", country: "United Arab Emirates", city: "Abu Dhabi", address: "Gate Tower 1", value: 620000, type: "residential", score: 68, outlook: "neutral", delta: 3.5, beds: 2, baths: 2, sqft: 1300, momentum: 63 },
  { id: "demo-lon-1", name: "Shoreditch Workspace", country: "United Kingdom", city: "London", address: "48 Great Eastern St", value: 2750000, type: "commercial", score: 68, outlook: "neutral", delta: 2.4, beds: null, baths: 4, sqft: 4800, momentum: 69 },
  { id: "demo-lon-2", name: "Canary Wharf Flat", country: "United Kingdom", city: "London", address: "1 Canada Square", value: 890000, type: "residential", score: 63, outlook: "neutral", delta: 1.8, beds: 1, baths: 1, sqft: 720, momentum: 57 },
  { id: "demo-man-1", name: "Northern Quarter Loft", country: "United Kingdom", city: "Manchester", address: "22 Tib St", value: 420000, type: "residential", score: 70, outlook: "bullish", delta: 4.4, beds: 2, baths: 1, sqft: 900, momentum: 67 },
  { id: "demo-khi-1", name: "Clifton Seaview", country: "Pakistan", city: "Karachi", address: "Block 5, Clifton", value: 420000, type: "residential", score: 64, outlook: "neutral", delta: 4.0, beds: 4, baths: 4, sqft: 3200, momentum: 58 },
  { id: "demo-khi-2", name: "DHA Phase 8 Commercial Plot", country: "Pakistan", city: "Karachi", address: "Khayaban-e-Ittehad", value: 890000, type: "land", score: 59, outlook: "neutral", delta: 2.0, beds: null, baths: null, sqft: 4500, momentum: 54 },
  { id: "demo-lhe-1", name: "DHA Phase 6 Villa", country: "Pakistan", city: "Lahore", address: "Street 12, DHA Phase 6", value: 380000, type: "residential", score: 70, outlook: "bullish", delta: 5.5, beds: 5, baths: 5, sqft: 4500, momentum: 61 },
  { id: "demo-lhe-2", name: "Gulberg Boutique Offices", country: "Pakistan", city: "Lahore", address: "Main Boulevard Gulberg", value: 510000, type: "commercial", score: 65, outlook: "neutral", delta: 3.1, beds: null, baths: 5, sqft: 5200, momentum: 59 },
  { id: "demo-isb-1", name: "F-7 Diplomatic Enclave Flat", country: "Pakistan", city: "Islamabad", address: "Street 42, F-7/1", value: 290000, type: "residential", score: 72, outlook: "bullish", delta: 5.0, beds: 3, baths: 3, sqft: 2400, momentum: 66 },
  { id: "demo-tor-1", name: "King West Loft", country: "Canada", city: "Toronto", address: "560 King St W", value: 980000, type: "residential", score: 67, outlook: "neutral", delta: 2.9, beds: 1, baths: 1, sqft: 780, momentum: 66 },
  { id: "demo-tor-2", name: "Yorkville Boutique Hotel Site", country: "Canada", city: "Toronto", address: "88 Avenue Rd", value: 7800000, type: "mixed", score: 60, outlook: "bearish", delta: -0.8, beds: null, baths: null, sqft: 18000, momentum: 52 },
  { id: "demo-van-1", name: "Yaletown Sky Residence", country: "Canada", city: "Vancouver", address: "1200 Pacific Blvd", value: 1250000, type: "residential", score: 71, outlook: "bullish", delta: 3.8, beds: 2, baths: 2, sqft: 1050, momentum: 69 },
  { id: "demo-mum-1", name: "Bandra West Sea-Facing", country: "India", city: "Mumbai", address: "Pali Hill", value: 980000, type: "residential", score: 75, outlook: "bullish", delta: 6.1, beds: 3, baths: 3, sqft: 1800, momentum: 73 },
  { id: "demo-del-1", name: "Golf Course Road Tower", country: "India", city: "Delhi", address: "Sector 54, Gurgaon", value: 640000, type: "residential", score: 69, outlook: "neutral", delta: 3.6, beds: 3, baths: 3, sqft: 1950, momentum: 65 },
  { id: "demo-sg-1", name: "Marina Bay Serviced Suite", country: "Singapore", city: "Singapore", address: "6 Raffles Blvd", value: 2100000, type: "residential", score: 77, outlook: "bullish", delta: 4.0, beds: 1, baths: 1, sqft: 680, momentum: 76 },
  { id: "demo-sg-2", name: "Changi Logistics Bay", country: "Singapore", city: "Singapore", address: "Airport Logistics Park", value: 5600000, type: "commercial", score: 74, outlook: "bullish", delta: 5.2, beds: null, baths: 4, sqft: 22000, momentum: 72 },
  { id: "demo-ryd-1", name: "Diplomatic Quarter Villa", country: "Saudi Arabia", city: "Riyadh", address: "Diplomatic Quarter", value: 1550000, type: "residential", score: 78, outlook: "bullish", delta: 6.8, beds: 5, baths: 6, sqft: 5200, momentum: 75 },
  { id: "demo-jed-1", name: "Corniche Mixed Block", country: "Saudi Arabia", city: "Jeddah", address: "Corniche Rd", value: 2200000, type: "mixed", score: 70, outlook: "bullish", delta: 5.0, beds: null, baths: 8, sqft: 11000, momentum: 67 },
];

function toAsset(spec: Spec, imageIndex: number): PortfolioAsset {
  const coords = resolveCoords(spec.country, spec.city);
  return {
    id: spec.id,
    asset_type: "real_estate",
    name: spec.name,
    status: "watchlist",
    acquisition_cost: Math.round(spec.value * 0.92),
    current_value: spec.value,
    currency: "USD",
    acquired_at: null,
    sold_at: null,
    notes: null,
    candidate_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    domain: null,
    real_estate: {
      address: spec.address,
      city: spec.city,
      region: null,
      country: spec.country,
      postal_code: null,
      property_type: spec.type,
      bedrooms: spec.beds ?? null,
      bathrooms: spec.baths ?? null,
      square_feet: spec.sqft ?? 1800,
      square_meters: null,
      lot_size: null,
      year_built: 2016 + (imageIndex % 8),
      occupancy: spec.type === "residential" ? "vacant" : "rented",
      monthly_rent: Math.round(spec.value * 0.004),
      annual_taxes: Math.round(spec.value * 0.01),
      hoa_fees: null,
      listing_url: null,
      image_url: IMAGES[imageIndex % IMAGES.length],
      location_momentum: spec.momentum ?? 60,
      condition_score: 65 + (imageIndex % 20),
      market_notes: null,
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
    },
  };
}

export const DEMO_PROPERTIES: PropertyCard[] = SPECS.map((spec, i) => ({
  asset: toAsset(spec, i),
  intelligence_score: spec.score,
  outlook: spec.outlook,
  predicted_delta_pct: spec.delta,
  formula_version: "domzop-re-v1",
}));

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
  const re = card.asset.real_estate;
  const deep = buildDeepPropertyIntelligence({
    assetId: card.asset.id,
    name: card.asset.name,
    city: re?.city ?? "Unknown",
    country: re?.country ?? "Unknown",
    value,
    score,
    outlook,
  });

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
      narrative: deep.thesis,
      factors: deep.formula_steps.map((s) => ({
        key: s.name.toLowerCase().replace(/\s+/g, "_"),
        label: s.name,
        score: Math.min(100, s.contribution * 3),
        direction: s.direction,
        note: s.detail,
      })),
      past_json: {
        events: deep.rate_history.slice(-6).map((h) => ({
          at: h.date,
          label: "Median mark",
          value: h.median_sale,
        })),
      },
      present_json: {
        estimate: value,
        occupancy: re?.occupancy,
        yield_pct: 4.8,
        location_momentum: re?.location_momentum,
        condition_score: re?.condition_score,
      },
      future_json: { outlook, projections: deep.projections },
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
    deep,
  };
}
