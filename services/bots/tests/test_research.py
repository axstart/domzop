"""Tests for research lab bot heuristics."""

from bots.research import (
    _brandability_score,
    _classify_category,
    _competition_density,
    _trend_score,
)
from bots.scoring import _confidence_band


def test_classify_ai_category():
    assert _classify_category(["ai", "chatbot", "saas"]) == "ai"


def test_classify_fintech():
    assert _classify_category(["pay", "wallet"]) == "fintech"


def test_classify_general_fallback():
    assert _classify_category(["foobar", "bazqux"]) == "general"


def test_trend_score_with_trending_keywords():
    score = _trend_score(["ai", "agent", "automation"])
    assert score >= 70


def test_competition_density():
    assert _competition_density(["app", "web", "tool"]) == "high"
    assert _competition_density(["x"]) == "low"


def test_brandability_short_alpha_slug():
    score = _brandability_score("myapp", ["my", "app"])
    assert score >= 60


def test_confidence_bands():
    assert _confidence_band(80) == "strong"
    assert _confidence_band(60) == "moderate"
    assert _confidence_band(40) == "ambiguous"
