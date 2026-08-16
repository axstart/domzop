-- Wait & See: domain candidate lifecycle schema
-- State machine: discovered -> monitoring -> evaluated -> purchased | discarded

CREATE TYPE candidate_status AS ENUM (
  'discovered',
  'monitoring',
  'evaluated',
  'purchased',
  'discarded'
);

CREATE TYPE platform_type AS ENUM (
  'vercel',
  'netlify',
  'onrender'
);

CREATE TYPE discard_reason AS ENUM (
  'com_unavailable',
  'site_unreachable',
  'no_activity',
  'low_quality_score',
  'manual',
  'purchase_failed',
  'expired_monitoring'
);

CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_slug TEXT NOT NULL,
  platform platform_type NOT NULL,
  deploy_url TEXT NOT NULL,
  com_domain TEXT NOT NULL,
  com_available BOOLEAN,
  status candidate_status NOT NULL DEFAULT 'discovered',
  quality_score NUMERIC(5,2),
  quality_notes TEXT,
  discard_reason discard_reason,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  monitoring_started_at TIMESTAMPTZ,
  evaluated_at TIMESTAMPTZ,
  purchased_at TIMESTAMPTZ,
  discarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (platform, project_slug)
);

CREATE INDEX idx_candidates_status ON candidates (status);
CREATE INDEX idx_candidates_com_domain ON candidates (com_domain);
CREATE INDEX idx_candidates_monitoring ON candidates (status, monitoring_started_at)
  WHERE status = 'monitoring';

CREATE TABLE poll_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
  polled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  http_status INT,
  bundle_hashes JSONB DEFAULT '[]'::jsonb,
  dom_hash TEXT,
  payload_fingerprint TEXT,
  screenshot_path TEXT,
  raw_metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_poll_snapshots_candidate ON poll_snapshots (candidate_id, polled_at DESC);

CREATE TABLE status_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
  from_status candidate_status,
  to_status candidate_status NOT NULL,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_status_transitions_candidate ON status_transitions (candidate_id, created_at DESC);

CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
  registrar TEXT NOT NULL DEFAULT 'namecheap',
  domain TEXT NOT NULL,
  price_usd NUMERIC(10,2),
  order_id TEXT,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  error_message TEXT,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_settings (key, value) VALUES
  ('quality_score_threshold', '75'),
  ('poll_interval_hours', '24'),
  ('auto_purchase_enabled', 'false'),
  ('max_purchase_price_usd', '12');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER candidates_updated_at
  BEFORE UPDATE ON candidates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Log status transitions automatically
CREATE OR REPLACE FUNCTION log_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO status_transitions (candidate_id, from_status, to_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER candidates_status_transition
  AFTER UPDATE OF status ON candidates
  FOR EACH ROW EXECUTE FUNCTION log_status_transition();
