-- Portfolio manager: unified holdings for domains and real estate

DO $$ BEGIN
  CREATE TYPE asset_type AS ENUM ('domain', 'real_estate');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE asset_status AS ENUM ('watchlist', 'owned', 'listed', 'sold', 'discarded');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE property_type AS ENUM ('residential', 'commercial', 'land', 'mixed', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE occupancy_type AS ENUM ('vacant', 'owner', 'rented');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE valuation_source AS ENUM ('manual', 'appraisal', 'estimate');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type asset_type NOT NULL,
  name TEXT NOT NULL,
  status asset_status NOT NULL DEFAULT 'owned',
  acquisition_cost NUMERIC(14,2),
  current_value NUMERIC(14,2),
  currency TEXT NOT NULL DEFAULT 'USD',
  acquired_at TIMESTAMPTZ,
  sold_at TIMESTAMPTZ,
  notes TEXT,
  candidate_id UUID REFERENCES candidates (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_candidate
  ON assets (candidate_id)
  WHERE candidate_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assets_type_status ON assets (asset_type, status);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets (status);

CREATE TABLE IF NOT EXISTS domain_holdings (
  asset_id UUID PRIMARY KEY REFERENCES assets (id) ON DELETE CASCADE,
  domain_name TEXT NOT NULL,
  registrar TEXT,
  expiry_date DATE,
  auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
  tld TEXT,
  research_score NUMERIC(5,2)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_domain_holdings_name_lower
  ON domain_holdings (lower(domain_name));

CREATE TABLE IF NOT EXISTS real_estate_holdings (
  asset_id UUID PRIMARY KEY REFERENCES assets (id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  city TEXT,
  region TEXT,
  country TEXT,
  postal_code TEXT,
  property_type property_type NOT NULL DEFAULT 'residential',
  bedrooms NUMERIC(4,1),
  bathrooms NUMERIC(4,1),
  square_feet NUMERIC(12,2),
  square_meters NUMERIC(12,2),
  lot_size NUMERIC(14,2),
  year_built INT,
  occupancy occupancy_type,
  monthly_rent NUMERIC(12,2),
  annual_taxes NUMERIC(12,2),
  hoa_fees NUMERIC(12,2),
  listing_url TEXT,
  image_url TEXT
);

CREATE TABLE IF NOT EXISTS valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets (id) ON DELETE CASCADE,
  valued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  value NUMERIC(14,2) NOT NULL,
  source valuation_source NOT NULL DEFAULT 'manual',
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_valuations_asset
  ON valuations (asset_id, valued_at DESC);

DROP TRIGGER IF EXISTS assets_updated_at ON assets;
CREATE TRIGGER assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION sync_real_estate_area_units()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.square_feet IS NOT NULL AND NEW.square_meters IS NULL THEN
    NEW.square_meters := ROUND((NEW.square_feet * 0.09290304)::numeric, 2);
  ELSIF NEW.square_meters IS NOT NULL AND NEW.square_feet IS NULL THEN
    NEW.square_feet := ROUND((NEW.square_meters / 0.09290304)::numeric, 2);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS real_estate_area_units ON real_estate_holdings;
CREATE TRIGGER real_estate_area_units
  BEFORE INSERT OR UPDATE ON real_estate_holdings
  FOR EACH ROW EXECUTE FUNCTION sync_real_estate_area_units();

-- Upsert a domain holding when a research candidate is acquired
CREATE OR REPLACE FUNCTION upsert_domain_asset_from_candidate(p_candidate_id UUID)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_asset_id UUID;
  v_domain TEXT;
  v_score NUMERIC;
  v_notes TEXT;
  v_tld TEXT;
BEGIN
  SELECT com_domain, investment_score, investment_notes
    INTO v_domain, v_score, v_notes
  FROM candidates
  WHERE id = p_candidate_id;

  IF v_domain IS NULL THEN
    RAISE EXCEPTION 'candidate % not found', p_candidate_id;
  END IF;

  v_tld := lower(regexp_replace(v_domain, '^.*\.', ''));

  SELECT id INTO v_asset_id FROM assets WHERE candidate_id = p_candidate_id;

  IF v_asset_id IS NULL THEN
    SELECT a.id INTO v_asset_id
    FROM assets a
    JOIN domain_holdings d ON d.asset_id = a.id
    WHERE lower(d.domain_name) = lower(v_domain);
  END IF;

  IF v_asset_id IS NULL THEN
    INSERT INTO assets (
      asset_type, name, status, currency, acquired_at, notes, candidate_id
    )
    VALUES (
      'domain', v_domain, 'owned', 'USD', NOW(), v_notes, p_candidate_id
    )
    RETURNING id INTO v_asset_id;

    INSERT INTO domain_holdings (asset_id, domain_name, tld, research_score)
    VALUES (v_asset_id, v_domain, v_tld, v_score);
  ELSE
    UPDATE assets
    SET
      candidate_id = COALESCE(candidate_id, p_candidate_id),
      status = CASE WHEN status IN ('watchlist', 'discarded') THEN 'owned' ELSE status END,
      acquired_at = COALESCE(acquired_at, NOW()),
      notes = COALESCE(notes, v_notes)
    WHERE id = v_asset_id;

    INSERT INTO domain_holdings (asset_id, domain_name, tld, research_score)
    VALUES (v_asset_id, v_domain, v_tld, v_score)
    ON CONFLICT (asset_id) DO UPDATE
      SET
        research_score = COALESCE(domain_holdings.research_score, EXCLUDED.research_score),
        tld = COALESCE(domain_holdings.tld, EXCLUDED.tld);
  END IF;

  RETURN v_asset_id;
END;
$$;

CREATE OR REPLACE FUNCTION candidates_purchased_to_portfolio()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'purchased' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM upsert_domain_asset_from_candidate(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS candidates_purchased_portfolio ON candidates;
CREATE TRIGGER candidates_purchased_portfolio
  AFTER UPDATE OF status ON candidates
  FOR EACH ROW EXECUTE FUNCTION candidates_purchased_to_portfolio();
