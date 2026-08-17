"""Sanity checks for the portfolio schema migration."""

from pathlib import Path

SCHEMA = Path(__file__).resolve().parents[3] / "supabase" / "migrations" / "003_portfolio_schema.sql"


def test_portfolio_schema_file_exists():
    assert SCHEMA.is_file()


def test_portfolio_schema_defines_core_tables():
    sql = SCHEMA.read_text(encoding="utf-8").lower()
    for table in ("assets", "domain_holdings", "real_estate_holdings", "valuations"):
        assert f"create table if not exists {table}" in sql


def test_portfolio_schema_asset_classes_and_statuses():
    sql = SCHEMA.read_text(encoding="utf-8")
    assert "'domain'" in sql
    assert "'real_estate'" in sql
    for status in ("watchlist", "owned", "listed", "sold", "discarded"):
        assert f"'{status}'" in sql


def test_portfolio_schema_links_purchased_candidates():
    sql = SCHEMA.read_text(encoding="utf-8")
    assert "upsert_domain_asset_from_candidate" in sql
    assert "candidates_purchased_to_portfolio" in sql
    assert "candidate_id" in sql


def test_money_helpers_exist():
    money = Path(__file__).resolve().parents[3] / "admin" / "src" / "lib" / "money.ts"
    text = money.read_text(encoding="utf-8")
    assert "export function allocationPercents" in text
    assert "export function unrealizedPl" in text
