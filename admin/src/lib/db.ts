import { Pool } from "pg";

const globalForPg = globalThis as unknown as { pgPool?: Pool };

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getPool(): Pool {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured");
  }
  if (!globalForPg.pgPool) {
    globalForPg.pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
    });
  }
  return globalForPg.pgPool;
}

export type CandidateStatus =
  | "discovered"
  | "monitoring"
  | "evaluated"
  | "purchased"
  | "discarded";

export interface Candidate {
  id: string;
  project_slug: string;
  platform: string;
  deploy_url: string;
  com_domain: string;
  com_available: boolean | null;
  status: CandidateStatus;
  quality_score: number | null;
  quality_notes: string | null;
  investment_score: number | null;
  investment_notes: string | null;
  first_seen_at: string;
  monitoring_started_at: string | null;
  evaluated_at: string | null;
  poll_count: number;
}

export async function listCandidates(status?: CandidateStatus): Promise<Candidate[]> {
  if (!isDatabaseConfigured()) return [];
  const query = status
    ? `SELECT c.*, COALESCE(p.cnt, 0)::int AS poll_count
       FROM candidates c
       LEFT JOIN (SELECT candidate_id, COUNT(*) cnt FROM poll_snapshots GROUP BY candidate_id) p
         ON p.candidate_id = c.id
       WHERE c.status = $1
       ORDER BY c.updated_at DESC LIMIT 200`
    : `SELECT c.*, COALESCE(p.cnt, 0)::int AS poll_count
       FROM candidates c
       LEFT JOIN (SELECT candidate_id, COUNT(*) cnt FROM poll_snapshots GROUP BY candidate_id) p
         ON p.candidate_id = c.id
       ORDER BY c.updated_at DESC LIMIT 200`;

  const { rows } = await getPool().query(query, status ? [status] : []);
  return rows;
}

export async function getStats() {
  if (!isDatabaseConfigured()) {
    return {
      monitoring: 0,
      evaluated: 0,
      purchased: 0,
      discarded: 0,
      high_score: 0,
      total: 0,
    };
  }
  const { rows } = await getPool().query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'monitoring') AS monitoring,
      COUNT(*) FILTER (WHERE status = 'evaluated') AS evaluated,
      COUNT(*) FILTER (WHERE status = 'purchased') AS purchased,
      COUNT(*) FILTER (WHERE status = 'discarded') AS discarded,
      COUNT(*) FILTER (WHERE investment_score >= 70) AS high_score,
      COUNT(*) AS total
    FROM candidates
  `);
  return rows[0];
}

export interface InvestorProfile {
  id: string;
  name: string;
  email: string | null;
  categories: string[];
  min_score: number;
  tlds: string[];
  budget_usd: number | null;
  excluded_keywords: string[];
  active: boolean;
  created_at: string;
}

export async function listInvestorProfiles(): Promise<InvestorProfile[]> {
  if (!isDatabaseConfigured()) return [];
  const { rows } = await getPool().query(
    `SELECT * FROM investor_profiles ORDER BY created_at DESC`,
  );
  return rows;
}

export async function getInvestorProfile(id: string): Promise<InvestorProfile | null> {
  if (!isDatabaseConfigured()) return null;
  const { rows } = await getPool().query(`SELECT * FROM investor_profiles WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createInvestorProfile(data: {
  name: string;
  email?: string;
  categories: string[];
  min_score: number;
  tlds: string[];
  budget_usd?: number;
  excluded_keywords?: string[];
}): Promise<InvestorProfile> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured");
  }
  const { rows } = await getPool().query(
    `INSERT INTO investor_profiles (name, email, categories, min_score, tlds, budget_usd, excluded_keywords)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      data.name,
      data.email ?? null,
      data.categories,
      data.min_score,
      data.tlds,
      data.budget_usd ?? null,
      data.excluded_keywords ?? [],
    ],
  );
  return rows[0];
}

export async function updateInvestorProfile(
  id: string,
  data: Partial<{
    name: string;
    email: string | null;
    categories: string[];
    min_score: number;
    tlds: string[];
    budget_usd: number | null;
    excluded_keywords: string[];
    active: boolean;
  }>,
): Promise<InvestorProfile | null> {
  if (!isDatabaseConfigured()) return null;
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${key} = $${i++}`);
      values.push(value);
    }
  }
  if (!fields.length) return getInvestorProfile(id);
  values.push(id);
  const { rows } = await getPool().query(
    `UPDATE investor_profiles SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
    values,
  );
  return rows[0] ?? null;
}

export interface InvestmentReport {
  id: string;
  investor_profile_id: string | null;
  title: string;
  report_json: Record<string, unknown>;
  report_markdown: string | null;
  candidate_count: number;
  generated_at: string;
}

export async function listReports(limit = 20): Promise<InvestmentReport[]> {
  if (!isDatabaseConfigured()) return [];
  const { rows } = await getPool().query(
    `SELECT id, investor_profile_id, title, candidate_count, generated_at
     FROM investment_reports ORDER BY generated_at DESC LIMIT $1`,
    [limit],
  );
  return rows;
}

export async function getReport(id: string): Promise<InvestmentReport | null> {
  if (!isDatabaseConfigured()) return null;
  const { rows } = await getPool().query(`SELECT * FROM investment_reports WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export interface BotRun {
  bot_name: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  jobs_processed: number;
  jobs_failed: number;
  last_run: string;
}

export async function getBotStatus(): Promise<BotRun[]> {
  if (!isDatabaseConfigured()) return [];
  const { rows } = await getPool().query(`
    SELECT DISTINCT ON (bot_name)
      bot_name, status, started_at, completed_at,
      jobs_processed, jobs_failed, created_at AS last_run
    FROM bot_runs
    ORDER BY bot_name, created_at DESC
  `);
  return rows;
}

export async function getCandidateDetail(id: string) {
  if (!isDatabaseConfigured()) return null;
  const { rows: candidates } = await getPool().query(`SELECT * FROM candidates WHERE id = $1`, [id]);
  if (!candidates[0]) return null;

  const { rows: keywords } = await getPool().query(
    `SELECT keyword, source, weight FROM keywords WHERE candidate_id = $1 ORDER BY weight DESC`,
    [id],
  );
  const { rows: research } = await getPool().query(
    `SELECT * FROM research_results WHERE candidate_id = $1`,
    [id],
  );
  const { rows: availability } = await getPool().query(
    `SELECT domain, tld, available, checked_at FROM domain_availability WHERE candidate_id = $1`,
    [id],
  );
  const { rows: polls } = await getPool().query(
    `SELECT polled_at, http_status, dom_hash FROM poll_snapshots
     WHERE candidate_id = $1 ORDER BY polled_at DESC LIMIT 10`,
    [id],
  );

  return {
    candidate: candidates[0],
    keywords,
    research: research[0] ?? null,
    availability,
    polls,
  };
}

