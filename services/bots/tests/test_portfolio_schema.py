"""Sanity checks for portfolio + property intelligence schema and formula."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SCHEMA_003 = ROOT / "supabase" / "migrations" / "003_portfolio_schema.sql"
SCHEMA_004 = ROOT / "supabase" / "migrations" / "004_property_intelligence.sql"
FORMULA = ROOT / "admin" / "src" / "lib" / "domzop-formula.ts"


def test_portfolio_schema_file_exists():
    assert SCHEMA_003.is_file()


def test_portfolio_schema_defines_core_tables():
    sql = SCHEMA_003.read_text(encoding="utf-8").lower()
    for table in ("assets", "domain_holdings", "real_estate_holdings", "valuations"):
        assert f"create table if not exists {table}" in sql


def test_portfolio_schema_asset_classes_and_statuses():
    sql = SCHEMA_003.read_text(encoding="utf-8")
    assert "'domain'" in sql
    assert "'real_estate'" in sql
    for status in ("watchlist", "owned", "listed", "sold", "discarded"):
        assert f"'{status}'" in sql


def test_portfolio_schema_links_purchased_candidates():
    sql = SCHEMA_003.read_text(encoding="utf-8")
    assert "upsert_domain_asset_from_candidate" in sql
    assert "candidates_purchased_to_portfolio" in sql
    assert "candidate_id" in sql


def test_money_helpers_exist():
    money = ROOT / "admin" / "src" / "lib" / "money.ts"
    text = money.read_text(encoding="utf-8")
    assert "export function allocationPercents" in text
    assert "export function unrealizedPl" in text


def test_intelligence_schema_exists():
    assert SCHEMA_004.is_file()
    sql = SCHEMA_004.read_text(encoding="utf-8")
    assert "property_catalysts" in sql
    assert "property_intelligence_snapshots" in sql
    assert "location_momentum" in sql
    assert "domzop-re-v1" in sql


def test_formula_version_and_weights_sum_to_one():
    text = FORMULA.read_text(encoding="utf-8")
    assert 'export const FORMULA_VERSION = "domzop-re-v1"' in text
    assert "export function computeDomzopFormula" in text
    weights = dict(
        re.findall(r"(location|yield|catalysts|risk|position):\s*(0\.\d+)", text),
    )
    assert set(weights) == {"location", "yield", "catalysts", "risk", "position"}
    total = sum(float(v) for v in weights.values())
    assert abs(total - 1.0) < 1e-9
