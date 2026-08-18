import type {
  DeepDomainIntelligence,
  DeepPropertyIntelligence,
  NewsItem,
  ProjectionScenario,
  RateHistoryPoint,
  RelatedProjectDeep,
} from "@/lib/deep-types";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function monthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
}

export function buildRateHistory(basePrice: number, city: string): RateHistoryPoint[] {
  const psf0 = Math.max(80, Math.round(basePrice / 1800));
  const points: RateHistoryPoint[] = [];
  for (let i = 24; i >= 0; i -= 1) {
    const cycle = Math.sin((24 - i) / 4) * 0.04;
    const trend = (24 - i) * 0.006;
    const noise = ((i * 17) % 7) / 200;
    const mult = 1 - 0.12 + trend + cycle + noise;
    points.push({
      date: monthsAgo(i),
      price_psf: Math.round(psf0 * mult),
      median_sale: Math.round(basePrice * mult),
      rent_psf: Math.round(psf0 * mult * 0.0045 * 100) / 100,
      days_on_market: Math.round(28 + ((i * 3) % 40)),
      inventory: Math.round(120 + ((i * 11) % 80)),
      source: `${city} submarket composite`,
    });
  }
  return points;
}

function newsFor(
  assetId: string,
  city: string,
  country: string,
  name: string,
): NewsItem[] {
  return [
    {
      id: `${assetId}-n1`,
      title: `${city} zoning board advances mixed-use density near core corridors`,
      summary: `Local planning staff recommended higher FAR allowances that could lift residual land values within 2 km of ${name}.`,
      category: "policy",
      sentiment: "positive",
      impact_score: 42,
      confidence: 68,
      source: "Municipal Planning Digest",
      published_at: daysAgo(4),
      tags: ["zoning", "FAR", city],
      entities: [city, "Planning Board"],
      region: city,
      why_it_matters:
        "Higher allowable density improves redevelopment optionality and can re-rate nearby stabilized assets.",
    },
    {
      id: `${assetId}-n2`,
      title: `Builder pipeline: 1,800 new units announced within the ${city} submarket`,
      summary:
        "Three mid-rise projects filed for permits. Near-term absorption risk rises if deliveries cluster.",
      category: "builder",
      sentiment: "negative",
      impact_score: -36,
      confidence: 74,
      source: "Construction Watch",
      published_at: daysAgo(9),
      tags: ["supply", "permits", "absorption"],
      entities: ["Horizon BuildCo", city],
      region: city,
      why_it_matters:
        "Competing supply can flatten rents and extend days-on-market for 12–24 months.",
    },
    {
      id: `${assetId}-n3`,
      title: `Proprietor group refinances portfolio — signals confidence in ${city}`,
      summary:
        "A regional landlord closed a multi-asset refinance at tighter spreads than 2024 averages.",
      category: "proprietor",
      sentiment: "positive",
      impact_score: 28,
      confidence: 61,
      source: "Capital Markets Desk",
      published_at: daysAgo(14),
      tags: ["refinance", "landlord", "spreads"],
      entities: ["Northbridge Estates"],
      region: city,
      why_it_matters: "Easier refinancing supports hold strategies and reduces forced-sale inventory.",
    },
    {
      id: `${assetId}-n4`,
      title: `${country} rate path: markets price two cuts over the next 12 months`,
      summary:
        "Mortgage-sensitive buyers may re-enter; cap-rate compression possible if cuts materialize.",
      category: "market",
      sentiment: "mixed",
      impact_score: 18,
      confidence: 55,
      source: "Macro Brief",
      published_at: daysAgo(2),
      tags: ["rates", "mortgage", "cap-rate"],
      entities: [country, "Central Bank"],
      region: country,
      why_it_matters: "Lower financing costs lift buyer pools and can reprice income assets upward.",
    },
    {
      id: `${assetId}-n5`,
      title: `Geopolitics: trade friction premium priced into ${country} risk assets`,
      summary:
        "FX volatility and insurance costs ticked higher for coastal logistics and luxury segments.",
      category: "geopolitics",
      sentiment: "negative",
      impact_score: -22,
      confidence: 58,
      source: "Geopolitical Risk Wire",
      published_at: daysAgo(6),
      tags: ["FX", "insurance", "trade"],
      entities: [country],
      region: country,
      why_it_matters:
        "Elevated risk premia can widen required yields and pressure foreign-buyer demand.",
    },
    {
      id: `${assetId}-n6`,
      title: `Transit authority confirms station upgrade serving ${city} district`,
      summary: "Capex allocated for accessibility and last-mile links; completion window 2027–28.",
      category: "infrastructure",
      sentiment: "positive",
      impact_score: 48,
      confidence: 72,
      source: "Transit Authority Bulletin",
      published_at: daysAgo(11),
      tags: ["transit", "capex", "accessibility"],
      entities: ["Transit Authority", city],
      region: city,
      why_it_matters: "Improved access historically correlates with rent and PSF premiums within walking radius.",
    },
    {
      id: `${assetId}-n7`,
      title: `Area retail footfall recovers to 108% of 2019 baseline near ${name}`,
      summary: "Weekend traffic and F&B spend lead the rebound; evening office occupancy still soft.",
      category: "area",
      sentiment: "positive",
      impact_score: 31,
      confidence: 66,
      source: "Footfall Analytics",
      published_at: daysAgo(3),
      tags: ["footfall", "retail", "occupancy"],
      entities: [city, name],
      region: city,
      why_it_matters: "Stronger amenity demand supports residential and mixed-use rent growth.",
    },
    {
      id: `${assetId}-n8`,
      title: `Environmental review flags flood-zone insurance uplift in parts of ${city}`,
      summary: "Select parcels face higher premiums; mitigation grants available for elevation works.",
      category: "environment",
      sentiment: "negative",
      impact_score: -27,
      confidence: 63,
      source: "Climate Risk Register",
      published_at: daysAgo(18),
      tags: ["flood", "insurance", "ESG"],
      entities: [city],
      region: city,
      why_it_matters: "Carry costs rise and buyer pools shrink unless mitigation is priced in.",
    },
    {
      id: `${assetId}-n9`,
      title: `Listing chatter: ${name} draws institutional inquiry`,
      summary: "Two family offices and one REIT requested packages; no LOI disclosed.",
      category: "property",
      sentiment: "positive",
      impact_score: 24,
      confidence: 50,
      source: "Broker Desk Notes",
      published_at: daysAgo(1),
      tags: ["institutional", "inquiry", "liquidity"],
      entities: [name],
      region: city,
      why_it_matters: "Buyer depth improves exit optionality and supports mark confidence.",
    },
    {
      id: `${assetId}-n10`,
      title: `Government housing incentive expands first-time buyer credits in ${country}`,
      summary: "Credits favor primary residences under a price ceiling — check eligibility for this asset class.",
      category: "policy",
      sentiment: "mixed",
      impact_score: 12,
      confidence: 60,
      source: "National Housing Policy Update",
      published_at: daysAgo(7),
      tags: ["buyer-credit", "housing-policy"],
      entities: [country],
      region: country,
      why_it_matters: "Can pull demand into eligible segments while leaving luxury less affected.",
    },
  ];
}

function projectsFor(assetId: string, city: string): RelatedProjectDeep[] {
  return [
    {
      id: `${assetId}-p1`,
      name: `${city} Metro Phase II`,
      category: "transit",
      status: "underway",
      impact_direction: "positive",
      impact_weight: 62,
      confidence: 78,
      horizon: "mid",
      distance_km: 0.9,
      description: "New station + feeder bus lanes within walking distance.",
      value_mechanism: "Access premium → rent PSF + liquidity",
      timeline: "Civil works 2026–2028; ops ramp 2029",
      sources: ["Transit Authority", "City Capex Plan"],
    },
    {
      id: `${assetId}-p2`,
      name: "Harbor Point Towers (competing supply)",
      category: "competing_supply",
      status: "underway",
      impact_direction: "negative",
      impact_weight: 48,
      confidence: 81,
      horizon: "near",
      distance_km: 1.4,
      description: "1,200 units delivering into the same submarket.",
      value_mechanism: "Absorption competition → slower rent growth",
      timeline: "First towers: late 2026",
      sources: ["Permit filings", "Construction Watch"],
    },
    {
      id: `${assetId}-p3`,
      name: "Waterfront promenade & park",
      category: "amenities",
      status: "proposed",
      impact_direction: "positive",
      impact_weight: 44,
      confidence: 57,
      horizon: "long",
      distance_km: 0.6,
      description: "Public realm upgrade funded by municipal + private levy.",
      value_mechanism: "Amenity gravity → buyer preference & PSF",
      timeline: "Design 2026; build 2027–2030",
      sources: ["Parks Master Plan"],
    },
    {
      id: `${assetId}-p4`,
      name: "Industrial logistics park expansion",
      category: "infra",
      status: "proposed",
      impact_direction: "negative",
      impact_weight: 30,
      confidence: 52,
      horizon: "mid",
      distance_km: 3.2,
      description: "Heavy truck routes may increase noise / air quality complaints.",
      value_mechanism: "Nuisance discount on residential comps",
      timeline: "EIA pending",
      sources: ["Port Authority draft"],
    },
    {
      id: `${assetId}-p5`,
      name: "School district capacity build",
      category: "amenities",
      status: "underway",
      impact_direction: "positive",
      impact_weight: 38,
      confidence: 70,
      horizon: "mid",
      distance_km: 1.1,
      description: "New K-12 campus reduces overcrowding.",
      value_mechanism: "Family demand → occupancy & rents",
      timeline: "Opens 2027",
      sources: ["Education Board"],
    },
  ];
}

export function buildDeepPropertyIntelligence(input: {
  assetId: string;
  name: string;
  city: string;
  country: string;
  value: number;
  score: number;
  outlook: string;
}): DeepPropertyIntelligence {
  const { assetId, name, city, country, value, score } = input;
  const history = buildRateHistory(value, city);
  const last = history[history.length - 1];
  const yoy =
    history.length > 12
      ? ((last.median_sale - history[history.length - 13].median_sale) /
          history[history.length - 13].median_sale) *
        100
      : 3;

  const projections: ProjectionScenario[] = [
    {
      key: "bear",
      label: "Bear — supply + rates stay sticky",
      y1: Math.round(value * 0.96),
      y3: Math.round(value * 0.98),
      y5: Math.round(value * 1.02),
      probability: 22,
      drivers: ["Competing deliveries", "Insurance uplift", "FX risk premium"],
    },
    {
      key: "base",
      label: "Base — Domzop Formula path",
      y1: Math.round(value * (1 + Math.max(0.02, score / 2000))),
      y3: Math.round(value * (1 + Math.max(0.06, score / 900))),
      y5: Math.round(value * (1 + Math.max(0.1, score / 600))),
      probability: 55,
      drivers: ["Transit access", "Footfall recovery", "Moderate rate cuts"],
    },
    {
      key: "bull",
      label: "Bull — density + liquidity surge",
      y1: Math.round(value * 1.08),
      y3: Math.round(value * 1.18),
      y5: Math.round(value * 1.32),
      probability: 23,
      drivers: ["Zoning uplift", "Institutional bid", "Faster transit ops"],
    },
  ];

  return {
    asset_id: assetId,
    headline: `${name}: ${input.outlook} setup in ${city}`,
    thesis: `Domzop Formula (${score}/100) balances location momentum, yield, related projects, and carry risk. ${city} shows ${yoy.toFixed(1)}% trailing median-sale drift on our composite. Near-term supply is the main headwind; transit and amenity work are the primary tailwinds.`,
    risk_summary:
      "Watch competing tower deliveries, flood/insurance costs, and geopolitics-driven FX/insurance premia. Near-horizon absorption risk is elevated.",
    opportunity_summary:
      "Transit Phase II, school capacity, and zoning FAR flexibility can re-rate PSF if delivery timelines hold. Institutional inquiry already signals exit depth.",
    news: newsFor(assetId, city, country, name),
    rate_history: history,
    projections,
    formula_steps: [
      {
        name: "Location momentum",
        input: `${city} momentum index`,
        weight: 0.28,
        contribution: Math.round(score * 0.28),
        direction: "tailwind",
        detail: "Submarket footfall, employment, and access scores.",
      },
      {
        name: "Income yield",
        input: "Gross rent / mark",
        weight: 0.22,
        contribution: Math.round(score * 0.2),
        direction: "neutral",
        detail: "Stabilized rent vs current mark; vacancy friction applied.",
      },
      {
        name: "Related projects",
        input: "Signed catalyst net",
        weight: 0.18,
        contribution: Math.round(score * 0.19),
        direction: "tailwind",
        detail: "Transit + amenities minus competing supply (confidence-weighted).",
      },
      {
        name: "Carry & condition",
        input: "Taxes / insurance / condition",
        weight: 0.16,
        contribution: Math.round(score * 0.14),
        direction: yoy < 0 ? "headwind" : "neutral",
        detail: "Includes climate insurance uplift where flagged.",
      },
      {
        name: "Position quality",
        input: "Marks + ownership mode",
        weight: 0.16,
        contribution: Math.round(score * 0.16),
        direction: "neutral",
        detail: "Watchlist vs owned; valuation mark density.",
      },
    ],
    formula_version: "domzop-re-v1",
    stakeholders: [
      {
        role: "builder",
        name: "Horizon BuildCo",
        reputation: 71,
        track_record: "12 mid-rise deliveries since 2018; 2 delayed >9 months",
        risk_flags: ["Delivery clustering 2026–27"],
        recent_activity: "Filed Harbor Point Towers permits",
      },
      {
        role: "proprietor",
        name: "Northbridge Estates",
        reputation: 78,
        track_record: "Long-hold residential landlord; low leverage historically",
        risk_flags: [],
        recent_activity: "Portfolio refinance closed",
      },
      {
        role: "developer",
        name: "Axiom Urban",
        reputation: 66,
        track_record: "Mixed-use focus; strong municipal relationships",
        risk_flags: ["Aggressive pre-sales"],
        recent_activity: "Lobbying for FAR uplift",
      },
      {
        role: "municipality",
        name: `${city} Planning Authority`,
        reputation: 74,
        track_record: "Generally pro-density with design review",
        risk_flags: ["Election-cycle policy swings"],
        recent_activity: "Advanced mixed-use zoning draft",
      },
      {
        role: "lender",
        name: "Coastal Commercial Bank",
        reputation: 80,
        track_record: "Active CRE book; tightened LTVs in 2024",
        risk_flags: ["Selective on flood zones"],
        recent_activity: "Quoted 65% LTV on comps",
      },
    ],
    related_projects: projectsFor(assetId, city),
    comps: [
      {
        name: "Comp A — similar vintage",
        distance_km: 0.4,
        price: Math.round(value * 0.94),
        price_psf: last.price_psf - 12,
        sold_at: monthsAgo(3),
      },
      {
        name: "Comp B — renovated",
        distance_km: 0.8,
        price: Math.round(value * 1.06),
        price_psf: last.price_psf + 18,
        sold_at: monthsAgo(5),
      },
      {
        name: "Comp C — larger floorplate",
        distance_km: 1.2,
        price: Math.round(value * 1.12),
        price_psf: last.price_psf + 5,
        sold_at: monthsAgo(8),
      },
    ],
    geopolitics: [
      {
        title: "Trade / FX volatility premium",
        impact: "negative",
        severity: 45,
        note: "Foreign-buyer demand sensitive to currency swings.",
      },
      {
        title: "Regional security insurance costs",
        impact: "negative",
        severity: 30,
        note: "Marine/coastal coverage quotes widened YoY.",
      },
      {
        title: "Cross-border capital seeking yield",
        impact: "positive",
        severity: 35,
        note: "Select family offices redeploying into gateway cities.",
      },
    ],
    policy_watch: [
      {
        title: "Mixed-use FAR draft",
        status: "committee",
        impact: "positive",
        note: "Could expand redevelopment option value.",
      },
      {
        title: "First-time buyer credit expansion",
        status: "enacted",
        impact: "mixed",
        note: "Helps entry product; limited luxury spillover.",
      },
      {
        title: "Short-term rental caps",
        status: "proposed",
        impact: "negative",
        note: "May reduce investor yield strategies in core districts.",
      },
    ],
  };
}

export function buildDeepDomainIntelligence(input: {
  id: string;
  domain: string;
  slug: string;
  category: string;
  score: number;
}): DeepDomainIntelligence {
  const { id, domain, slug, category, score } = input;
  return {
    candidate_id: id,
    domain,
    headline: `${domain}: ${category} brand runway`,
    thesis: `Keyword cluster around “${slug}” shows investable naming density. Domzop domain formula weights brandability, category heat, competitor crowding, and deployment maturity signals.`,
    keywords: [slug.split("-")[0], category, "saas", "app", "platform", slug],
    category,
    news: [
      {
        id: `${id}-dn1`,
        title: `${category} funding window remains open for seed–Series A`,
        summary: "Category deal count stable QoQ; brandable .coms still clear premiums.",
        category: "market",
        sentiment: "positive",
        impact_score: 34,
        confidence: 64,
        source: "Startup Capital Pulse",
        published_at: daysAgo(5),
        tags: [category, "funding"],
        entities: [category],
        why_it_matters: "Founder demand for clean .coms rises with active fundraising.",
      },
      {
        id: `${id}-dn2`,
        title: `Trademark clutter rising in “${slug.split("-")[0]}” class`,
        summary: "Similar marks filed in adjacent classes — clearance diligence advised.",
        category: "policy",
        sentiment: "negative",
        impact_score: -28,
        confidence: 58,
        source: "IP Watch",
        published_at: daysAgo(12),
        tags: ["trademark", "clearance"],
        entities: [slug],
        why_it_matters: "Legal risk can cap resale and end-user willingness to brand.",
      },
      {
        id: `${id}-dn3`,
        title: `Competitor landing pages using near-match domains`,
        summary: "Three live products use hyphenated or ccTLD variants.",
        category: "market",
        sentiment: "mixed",
        impact_score: -10,
        confidence: 70,
        source: "Brand Monitor",
        published_at: daysAgo(8),
        tags: ["competitors", "variants"],
        entities: [domain],
        why_it_matters: "Crowding lowers exclusivity but proves category demand.",
      },
      {
        id: `${id}-dn4`,
        title: "Registrar aftermarket: short brandables hold bid floors",
        summary: "Liquidity thinner below mid-tier asking prices; patient holds favored.",
        category: "market",
        sentiment: "neutral",
        impact_score: 5,
        confidence: 60,
        source: "Aftermarket Desk",
        published_at: daysAgo(2),
        tags: ["aftermarket", "liquidity"],
        entities: [domain],
        why_it_matters: "Exit timing matters more than raw registration cost.",
      },
    ],
    traffic_proxy: [
      { month: "Mar", score: 22 },
      { month: "Apr", score: 28 },
      { month: "May", score: 31 },
      { month: "Jun", score: 40 },
      { month: "Jul", score: 44 },
      { month: "Aug", score: 52 },
    ],
    competitors: [
      { domain: `${slug}.io`, strength: 62, note: "Tech-leaning audience" },
      { domain: `get${slug}.com`, strength: 48, note: "Marketing prefix pattern" },
      { domain: `${slug}app.com`, strength: 55, note: "Productized naming" },
    ],
    brandability: Math.min(95, Math.round(score * 0.9 + 8)),
    availability_notes: ".com target checked in sandbox path; confirm live registrar before buy.",
    risk_flags: ["Trademark adjacency", "Near-match competitors", "Aftermarket bid thinness"],
    opportunity_score: score,
    formula_steps: [
      {
        name: "Brandability",
        input: "Length / phonetics / memorability",
        weight: 0.3,
        contribution: Math.round(score * 0.3),
        direction: "tailwind",
        detail: "Short, pronounceable, category-fit.",
      },
      {
        name: "Category heat",
        input: `${category} demand index`,
        weight: 0.25,
        contribution: Math.round(score * 0.24),
        direction: "tailwind",
        detail: "Funding + search interest proxy.",
      },
      {
        name: "Competition",
        input: "Near-match density",
        weight: 0.2,
        contribution: Math.round(score * 0.18),
        direction: "headwind",
        detail: "Crowding reduces exclusivity premium.",
      },
      {
        name: "Deployment signal",
        input: "Live project maturity",
        weight: 0.15,
        contribution: Math.round(score * 0.16),
        direction: "neutral",
        detail: "Evidence of real product activity behind the name.",
      },
      {
        name: "Legal / policy",
        input: "Trademark risk",
        weight: 0.1,
        contribution: Math.round(score * 0.08),
        direction: "headwind",
        detail: "Clearance friction for end users.",
      },
    ],
    projections: [
      {
        horizon: "6 months",
        narrative: "Hold while category funding stays open; soft inquire builders.",
        score: Math.round(score * 0.92),
      },
      {
        horizon: "18 months",
        narrative: "If product matures, outbound to operators in category.",
        score: Math.round(score * 1.05),
      },
      {
        horizon: "36 months",
        narrative: "Brand consolidation window — premium if still unowned by operator.",
        score: Math.round(score * 1.12),
      },
    ],
  };
}
