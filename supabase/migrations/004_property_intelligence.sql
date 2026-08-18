-- Property intelligence lab: catalysts, formula snapshots, location factors

DO $$ BEGIN
  CREATE TYPE catalyst_category AS ENUM (
    'infra',
    'commercial',
    'residential',
    'zoning',
    'transit',
    'competing_supply',
    'amenities',
    'environmental',
    'policy',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE catalyst_status AS ENUM ('proposed', 'underway', 'completed', 'rumored');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE catalyst_direction AS ENUM ('positive', 'negative');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE catalyst_horizon AS ENUM ('near', 'mid', 'long');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE intelligence_outlook AS ENUM ('bullish', 'neutral', 'bearish');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE real_estate_holdings
  ADD COLUMN IF NOT EXISTS location_momentum NUMERIC(5,2) DEFAULT 50,
  ADD COLUMN IF NOT EXISTS condition_score NUMERIC(5,2) DEFAULT 60,
  ADD COLUMN IF NOT EXISTS market_notes TEXT;

CREATE TABLE IF NOT EXISTS property_catalysts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category catalyst_category NOT NULL DEFAULT 'other',
  status catalyst_status NOT NULL DEFAULT 'proposed',
  impact_direction catalyst_direction NOT NULL DEFAULT 'positive',
  impact_weight NUMERIC(5,2) NOT NULL DEFAULT 0,
  confidence NUMERIC(5,2) NOT NULL DEFAULT 50,
  horizon catalyst_horizon NOT NULL DEFAULT 'mid',
  estimated_start DATE,
  estimated_completion DATE,
  source_url TEXT,
  notes TEXT,
  origin TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT property_catalysts_weight_range CHECK (impact_weight BETWEEN -100 AND 100),
  CONSTRAINT property_catalysts_confidence_range CHECK (confidence BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_property_catalysts_asset
  ON property_catalysts (asset_id, created_at DESC);

DROP TRIGGER IF EXISTS property_catalysts_updated_at ON property_catalysts;
CREATE TRIGGER property_catalysts_updated_at
  BEFORE UPDATE ON property_catalysts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS property_intelligence_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets (id) ON DELETE CASCADE,
  formula_version TEXT NOT NULL DEFAULT 'domzop-re-v1',
  intelligence_score NUMERIC(5,2) NOT NULL,
  predicted_delta_pct NUMERIC(8,2) NOT NULL,
  predicted_value_1y NUMERIC(14,2),
  predicted_value_3y NUMERIC(14,2),
  predicted_value_5y NUMERIC(14,2),
  outlook intelligence_outlook NOT NULL DEFAULT 'neutral',
  narrative TEXT,
  factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  past_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  present_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  future_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intelligence_snapshots_asset
  ON property_intelligence_snapshots (asset_id, generated_at DESC);
