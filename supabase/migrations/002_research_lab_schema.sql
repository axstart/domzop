-- Domain Investing Research Lab extensions

-- Investment scoring on candidates
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS investment_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS investment_notes TEXT,
  ADD COLUMN IF NOT EXISTS scored_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_candidates_investment_score
  ON candidates (investment_score DESC NULLS LAST)
  WHERE investment_score IS NOT NULL;

-- Keywords extracted from project metadata
CREATE TABLE keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'slug',
  weight NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (candidate_id, keyword)
);

CREATE INDEX idx_keywords_candidate ON keywords (candidate_id);
CREATE INDEX idx_keywords_keyword ON keywords (keyword);

-- Research signals per candidate
CREATE TABLE research_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
  category TEXT,
  trend_score NUMERIC(5,2),
  competition_density TEXT,
  brandability_score NUMERIC(5,2),
  notes TEXT,
  sources JSONB DEFAULT '[]'::jsonb,
  researched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (candidate_id)
);

CREATE INDEX idx_research_results_category ON research_results (category);
CREATE INDEX idx_research_results_trend ON research_results (trend_score DESC);

-- Domain availability checks (batch / re-check)
CREATE TABLE domain_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  tld TEXT NOT NULL DEFAULT 'com',
  available BOOLEAN,
  price_usd NUMERIC(10,2),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (candidate_id, domain)
);

CREATE INDEX idx_domain_availability_available ON domain_availability (available, checked_at DESC);

-- Investor interest profiles
CREATE TABLE investor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  categories TEXT[] NOT NULL DEFAULT '{}',
  min_score NUMERIC(5,2) NOT NULL DEFAULT 60,
  tlds TEXT[] NOT NULL DEFAULT ARRAY['com'],
  budget_usd NUMERIC(10,2),
  excluded_keywords TEXT[] NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER investor_profiles_updated_at
  BEFORE UPDATE ON investor_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Generated investment reports
CREATE TABLE investment_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_profile_id UUID REFERENCES investor_profiles (id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  report_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  report_markdown TEXT,
  candidate_count INT NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_investment_reports_profile ON investment_reports (investor_profile_id, generated_at DESC);

-- Bot run tracking for parallel workers
CREATE TYPE bot_status AS ENUM ('pending', 'running', 'completed', 'failed');

CREATE TABLE bot_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_name TEXT NOT NULL,
  status bot_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  jobs_processed INT NOT NULL DEFAULT 0,
  jobs_failed INT NOT NULL DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bot_runs_name ON bot_runs (bot_name, created_at DESC);

CREATE TABLE bot_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_run_id UUID REFERENCES bot_runs (id) ON DELETE SET NULL,
  queue_name TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status bot_status NOT NULL DEFAULT 'pending',
  candidate_id UUID REFERENCES candidates (id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bot_jobs_status ON bot_jobs (status, created_at DESC);
CREATE INDEX idx_bot_jobs_candidate ON bot_jobs (candidate_id);

-- Seed a default global investor profile
INSERT INTO investor_profiles (name, email, categories, min_score, tlds, budget_usd)
VALUES (
  'Default — All Categories',
  NULL,
  ARRAY['saas', 'ai', 'fintech', 'devtools', 'productivity', 'health', 'ecommerce'],
  60,
  ARRAY['com'],
  50
);
