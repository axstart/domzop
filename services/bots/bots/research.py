"""Research bot — category classification and trend/competition heuristics."""

from __future__ import annotations

import json
import logging

import psycopg

from bots.common import BotRunner
from bots.config import QUEUE_AVAILABILITY, QUEUE_RESEARCH, BotSettings

logger = logging.getLogger("bots.research")

# Category keyword patterns (adapter pattern inspired by cizher CodeIntelligenceAdapter)
CATEGORY_PATTERNS: dict[str, list[str]] = {
    "ai": ["ai", "ml", "gpt", "llm", "neural", "model", "chatbot", "genai", "openai"],
    "saas": ["saas", "cloud", "platform", "dashboard", "workspace", "team", "subscription"],
    "fintech": ["pay", "finance", "bank", "crypto", "wallet", "invoice", "billing", "stripe"],
    "devtools": ["dev", "code", "api", "sdk", "git", "deploy", "ci", "debug", "lint"],
    "productivity": ["todo", "task", "note", "calendar", "planner", "organize", "flow"],
    "health": ["health", "fitness", "med", "wellness", "therapy", "clinic", "care"],
    "ecommerce": ["shop", "store", "cart", "commerce", "retail", "market", "sell"],
}

TREND_KEYWORDS = frozenset(
    "ai agent automation copilot llm gpt saas no-code low-code devtools fintech "
    "crypto web3 sustainability climate".split()
)


def _classify_category(keywords: list[str]) -> str | None:
    scores: dict[str, int] = {}
    for kw in keywords:
        for category, patterns in CATEGORY_PATTERNS.items():
            if any(p in kw for p in patterns):
                scores[category] = scores.get(category, 0) + 1
    if not scores:
        return "general"
    return max(scores, key=scores.get)


def _trend_score(keywords: list[str]) -> float:
    if not keywords:
        return 30.0
    hits = sum(1 for kw in keywords if any(t in kw for t in TREND_KEYWORDS))
    base = min(100.0, 40.0 + hits * 12.0)
    return round(base, 2)


def _competition_density(keywords: list[str]) -> str:
    generic = {"app", "web", "site", "tool", "hub", "lab", "pro", "io"}
    generic_hits = sum(1 for kw in keywords if kw in generic)
    if generic_hits >= 2:
        return "high"
    if len(keywords) <= 2:
        return "low"
    return "medium"


def _brandability_score(slug: str, keywords: list[str]) -> float:
    score = 50.0
    if 4 <= len(slug) <= 12:
        score += 15.0
    if slug.isalpha():
        score += 10.0
    if len(keywords) >= 3:
        score += 10.0
        score -= 5.0  # too many concepts dilutes brand
    return round(min(100.0, max(0.0, score)), 2)


async def run(settings: BotSettings) -> None:
    runner = BotRunner(settings, QUEUE_RESEARCH)

    async def handle(job: dict) -> None:
        candidate_id = job["candidate_id"]

        async with await psycopg.AsyncConnection.connect(settings.database_url) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT project_slug FROM candidates WHERE id = %s",
                    (candidate_id,),
                )
                slug_row = await cur.fetchone()
                if not slug_row:
                    return
                slug = slug_row[0]

                await cur.execute(
                    "SELECT keyword FROM keywords WHERE candidate_id = %s",
                    (candidate_id,),
                )
                kw_rows = await cur.fetchall()
                keywords = [r[0] for r in kw_rows]

                category = _classify_category(keywords)
                trend = _trend_score(keywords)
                competition = _competition_density(keywords)
                brandability = _brandability_score(slug, keywords)

                sources = [
                    {"type": "heuristic", "category_patterns": category},
                    {"type": "keyword_count", "count": len(keywords)},
                ]

                notes = (
                    f"Category: {category}. Trend score {trend}/100. "
                    f"Competition: {competition}. Brandability: {brandability}/100."
                )

                await cur.execute(
                    """
                    INSERT INTO research_results (
                      candidate_id, category, trend_score, competition_density,
                      brandability_score, notes, sources
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (candidate_id) DO UPDATE SET
                      category = EXCLUDED.category,
                      trend_score = EXCLUDED.trend_score,
                      competition_density = EXCLUDED.competition_density,
                      brandability_score = EXCLUDED.brandability_score,
                      notes = EXCLUDED.notes,
                      sources = EXCLUDED.sources,
                      researched_at = NOW()
                    """,
                    (
                        candidate_id,
                        category,
                        trend,
                        competition,
                        brandability,
                        notes,
                        json.dumps(sources),
                    ),
                )
            await conn.commit()

        logger.info("Researched candidate %s → %s (trend=%.0f)", candidate_id, category, trend)
        await runner.enqueue(QUEUE_AVAILABILITY, {"candidate_id": candidate_id})

    await runner.start(handle)
