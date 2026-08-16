"""Scoring bot — weighted investment potential (KhwarizmiEngine-inspired)."""

from __future__ import annotations

import logging

import psycopg

from bots.common import BotRunner
from bots.config import QUEUE_SCORE, BotSettings

logger = logging.getLogger("bots.scoring")

# Weighted multi-criteria scoring (adapted from cizher KhwarizmiEngine pattern)
WEIGHTS = {
    "deployment_maturity": 0.25,
    "keyword_quality": 0.20,
    "availability": 0.20,
    "research_signals": 0.25,
    "platform_signal": 0.10,
}

PLATFORM_SCORES = {
    "vercel": 85.0,
    "netlify": 75.0,
    "onrender": 70.0,
}


def _confidence_band(score: float) -> str:
    if score >= 75:
        return "strong"
    if score >= 55:
        return "moderate"
    return "ambiguous"


async def run(settings: BotSettings) -> None:
    runner = BotRunner(settings, QUEUE_SCORE)

    async def handle(job: dict) -> None:
        candidate_id = job["candidate_id"]

        async with await psycopg.AsyncConnection.connect(settings.database_url) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT c.platform, c.com_available, c.quality_score,
                           COALESCE(p.poll_count, 0), COALESCE(p.change_days, 0)
                    FROM candidates c
                    LEFT JOIN LATERAL (
                      SELECT COUNT(*) AS poll_count,
                             COUNT(DISTINCT dom_hash) AS change_days
                      FROM poll_snapshots ps WHERE ps.candidate_id = c.id
                    ) p ON TRUE
                    WHERE c.id = %s
                    """,
                    (candidate_id,),
                )
                row = await cur.fetchone()
                if not row:
                    return
                platform, com_available, quality_score, poll_count, change_days = row

                await cur.execute(
                    """
                    SELECT trend_score, brandability_score, competition_density, category
                    FROM research_results WHERE candidate_id = %s
                    """,
                    (candidate_id,),
                )
                research = await cur.fetchone()

                await cur.execute(
                    "SELECT AVG(weight) FROM keywords WHERE candidate_id = %s",
                    (candidate_id,),
                )
                kw_avg = await cur.fetchone()
                keyword_avg = float(kw_avg[0] or 1.0)

                # Deployment maturity (0-100)
                maturity = min(100.0, poll_count * 10 + change_days * 15)
                if quality_score:
                    maturity = (maturity + float(quality_score)) / 2

                # Keyword quality (0-100)
                keyword_score = min(100.0, keyword_avg * 30)

                # Availability (0-100)
                if com_available is True:
                    avail_score = 100.0
                elif com_available is False:
                    avail_score = 0.0
                else:
                    avail_score = 50.0

                # Research signals (0-100)
                if research:
                    trend, brand, competition, _ = research
                    research_score = (
                        float(trend or 50) * 0.5
                        + float(brand or 50) * 0.3
                        + (30.0 if competition == "low" else 60.0 if competition == "medium" else 20.0)
                        * 0.2
                    )
                else:
                    research_score = 40.0

                platform_score = PLATFORM_SCORES.get(platform, 60.0)

                total = (
                    maturity * WEIGHTS["deployment_maturity"]
                    + keyword_score * WEIGHTS["keyword_quality"]
                    + avail_score * WEIGHTS["availability"]
                    + research_score * WEIGHTS["research_signals"]
                    + platform_score * WEIGHTS["platform_signal"]
                )
                total = round(min(100.0, max(0.0, total)), 2)
                band = _confidence_band(total)

                breakdown = (
                    f"Investment score {total}/100 ({band}). "
                    f"Maturity={maturity:.0f}, Keywords={keyword_score:.0f}, "
                    f"Availability={avail_score:.0f}, Research={research_score:.0f}, "
                    f"Platform={platform_score:.0f}."
                )

                await cur.execute(
                    """
                    UPDATE candidates
                    SET investment_score = %s, investment_notes = %s, scored_at = NOW()
                    WHERE id = %s
                    """,
                    (total, breakdown, candidate_id),
                )
            await conn.commit()

        logger.info("Scored candidate %s → %.1f (%s)", candidate_id, total, band)

    await runner.start(handle)
