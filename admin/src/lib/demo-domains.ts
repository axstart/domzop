import { buildDeepDomainIntelligence } from "@/lib/deep-intelligence";

export interface DemoCandidate {
  id: string;
  project_slug: string;
  platform: string;
  deploy_url: string;
  com_domain: string;
  status: string;
  quality_score: number | null;
  investment_score: number | null;
  poll_count: number;
  first_seen_at: string;
  category: string;
}

const DOMAIN_SPECS: Array<{
  slug: string;
  platform: string;
  status: string;
  quality: number | null;
  invest: number;
  category: string;
  polls: number;
}> = [
  { slug: "northwind-crm", platform: "vercel", status: "evaluated", quality: 82, invest: 78, category: "saas", polls: 6 },
  { slug: "pixelbake", platform: "netlify", status: "monitoring", quality: null, invest: 61, category: "devtools", polls: 3 },
  { slug: "ledgerly", platform: "vercel", status: "evaluated", quality: 76, invest: 74, category: "fintech", polls: 5 },
  { slug: "orbitdesk", platform: "onrender", status: "monitoring", quality: null, invest: 58, category: "productivity", polls: 2 },
  { slug: "fluxpanel", platform: "vercel", status: "evaluated", quality: 88, invest: 85, category: "ai", polls: 8 },
  { slug: "shipyard-hq", platform: "netlify", status: "evaluated", quality: 71, invest: 69, category: "devtools", polls: 4 },
  { slug: "mintfolio", platform: "vercel", status: "monitoring", quality: null, invest: 66, category: "fintech", polls: 3 },
  { slug: "clearroute", platform: "onrender", status: "evaluated", quality: 79, invest: 72, category: "logistics", polls: 5 },
  { slug: "brightloom", platform: "vercel", status: "discarded", quality: 41, invest: 28, category: "saas", polls: 7 },
  { slug: "stacknurse", platform: "netlify", status: "evaluated", quality: 84, invest: 80, category: "healthtech", polls: 6 },
  { slug: "civicpulse", platform: "vercel", status: "monitoring", quality: null, invest: 63, category: "govtech", polls: 2 },
  { slug: "embercart", platform: "netlify", status: "evaluated", quality: 73, invest: 70, category: "ecommerce", polls: 5 },
  { slug: "quoracode", platform: "vercel", status: "evaluated", quality: 90, invest: 87, category: "ai", polls: 9 },
  { slug: "tideledger", platform: "onrender", status: "monitoring", quality: null, invest: 55, category: "fintech", polls: 1 },
  { slug: "helixops", platform: "vercel", status: "evaluated", quality: 77, invest: 75, category: "devtools", polls: 4 },
  { slug: "parsnip-ai", platform: "netlify", status: "evaluated", quality: 68, invest: 64, category: "ai", polls: 3 },
  { slug: "roofstack", platform: "vercel", status: "monitoring", quality: null, invest: 59, category: "proptech", polls: 2 },
  { slug: "amberlane", platform: "onrender", status: "evaluated", quality: 81, invest: 76, category: "saas", polls: 6 },
  { slug: "voltboard", platform: "vercel", status: "purchased", quality: 86, invest: 83, category: "productivity", polls: 7 },
  { slug: "nimbuspay", platform: "netlify", status: "evaluated", quality: 74, invest: 71, category: "fintech", polls: 5 },
  { slug: "cratewise", platform: "vercel", status: "monitoring", quality: null, invest: 57, category: "logistics", polls: 2 },
  { slug: "signalnest", platform: "onrender", status: "evaluated", quality: 80, invest: 77, category: "saas", polls: 4 },
  { slug: "formora", platform: "vercel", status: "evaluated", quality: 69, invest: 65, category: "devtools", polls: 3 },
  { slug: "glintmetrics", platform: "netlify", status: "monitoring", quality: null, invest: 60, category: "analytics", polls: 2 },
];

function platformHost(platform: string): string {
  if (platform === "netlify") return "netlify.app";
  if (platform === "onrender") return "onrender.com";
  return "vercel.app";
}

export const DEMO_CANDIDATES: DemoCandidate[] = DOMAIN_SPECS.map((s, i) => {
  const host = platformHost(s.platform);
  return {
    id: `demo-dom-${i + 1}`,
    project_slug: s.slug,
    platform: s.platform,
    deploy_url: `https://${s.slug}.${host}`,
    com_domain: `${s.slug}.com`,
    status: s.status,
    quality_score: s.quality,
    investment_score: s.invest,
    poll_count: s.polls,
    first_seen_at: new Date(Date.now() - (i + 2) * 86400000).toISOString(),
    category: s.category,
  };
});

export function isDemoDomainId(id: string): boolean {
  return id.startsWith("demo-dom-");
}

export function getDemoCandidate(id: string): DemoCandidate | undefined {
  return DEMO_CANDIDATES.find((c) => c.id === id);
}

export function filterDemoCandidates(status?: string): DemoCandidate[] {
  if (!status || status === "all") return DEMO_CANDIDATES;
  return DEMO_CANDIDATES.filter((c) => c.status === status);
}

export function demoDomainIntelligence(id: string) {
  const c = getDemoCandidate(id);
  if (!c) return null;
  const deep = buildDeepDomainIntelligence({
    id: c.id,
    domain: c.com_domain,
    slug: c.project_slug,
    category: c.category,
    score: c.investment_score ?? 50,
  });
  return { candidate: c, deep };
}
