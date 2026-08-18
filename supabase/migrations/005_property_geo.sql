-- Property map coordinates for listing map view
ALTER TABLE real_estate_holdings
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);

CREATE INDEX IF NOT EXISTS idx_real_estate_country_city
  ON real_estate_holdings (lower(country), lower(city));
