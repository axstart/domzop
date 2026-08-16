"""Report bot — generate investor-facing reports filtered by profiles."""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone

import psycopg

from bots.common import BotRunner
from bots.config import QUEUE_REPORT, BotSettings

logger = logging.getLogger("bots.report")


def _build_markdown(title: str, entries: list[dict], profile_name: str) -> str:
    lines = [
        f"# {title}",
        "",
        f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
        f"Investor profile: {profile_name}",
        f"Candidates: {len(entries)}",
        "",
        "---",
        "",
    ]
    for i, e in enumerate(entries, 1):
        action = "BUY" if e.get("com_available") and (e.get("investment_score") or 0) >= 70 else "WATCH"
        lines.extend(
            [
                f"## {i}. {e['project_slug']} ({e['platform']})",
                "",
                f"- **Deploy URL:** {e['deploy_url']}",
                f"- **Target domain:** `{e['com_domain']}`",
                f"- **Investment score:** {e.get('investment_score', '—')}/100",
                f"- **Quality score:** {e.get('quality_score', '—')}",
                f"- **.com available:** {'Yes' if e.get('com_available') else 'No' if e.get('com_available') is False else 'Unknown'}",
                f"- **Category:** {e.get('category', '—')}",
                f"- **Trend score:** {e.get('trend_score', '—')}",
                f"- **Keywords:** {', '.join(e.get('keywords', [])[:8]) or '—'}",
                f"- **Recommended action:** **{action}**",
                "",
            ]
        )
    return "\n".join(lines)


async def _generate_for_profile(
    settings: BotSettings,
    profile_id: str | None,
    profile_name: str,
    categories: list[str],
    min_score: float,
    tlds: list[str],
    excluded: list[str],
    only_available: bool,
) -> None:
    async with await psycopg.AsyncConnection.connect(settings.database_url) as conn:
        async with conn.cursor() as cur:
            query = """
                SELECT c.id, c.project_slug, c.platform, c.deploy_url, c.com_domain,
                       c.com_available, c.investment_score, c.quality_score,
                       r.category, r.trend_score, r.competition_density, r.brandability_score,
                       COALESCE(
                         (SELECT array_agg(k.keyword ORDER BY k.weight DESC)
                          FROM keywords k WHERE k.candidate_id = c.id),
                         '{}'
                       ) AS keywords
                FROM candidates c
                LEFT JOIN research_results r ON r.candidate_id = c.id
                WHERE c.status IN ('monitoring', 'evaluated')
                  AND c.investment_score >= %s
            """
            params: list = [min_score]

            if categories:
                query += " AND (r.category = ANY(%s) OR r.category IS NULL)"
                params.append(categories)

            if only_available and "com" in tlds:
                query += " AND c.com_available = TRUE"

            query += " ORDER BY c.investment_score DESC NULLS LAST LIMIT 50"

            await cur.execute(query, params)
            rows = await cur.fetchall()

            entries: list[dict] = []
            for row in rows:
                entry = {
                    "id": str(row[0]),
                    "project_slug": row[1],
                    "platform": row[2],
                    "deploy_url": row[3],
                    "com_domain": row[4],
                    "com_available": row[5],
                    "investment_score": float(row[6]) if row[6] else None,
                    "quality_score": float(row[7]) if row[7] else None,
                    "category": row[8],
                    "trend_score": float(row[9]) if row[9] else None,
                    "competition_density": row[10],
                    "brandability_score": float(row[11]) if row[11] else None,
                    "keywords": row[12] or [],
                }
                if excluded and any(
                    ex.lower() in entry["project_slug"].lower()
                    or any(ex.lower() in kw.lower() for kw in entry["keywords"])
                    for ex in excluded
                ):
                    continue
                entries.append(entry)

            title = f"Investment Report — {profile_name}"
            markdown = _build_markdown(title, entries, profile_name)
            report_json = {
                "title": title,
                "profile": profile_name,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "candidates": entries,
            }

            await cur.execute(
                """
                INSERT INTO investment_reports (
                  investor_profile_id, title, report_json, report_markdown, candidate_count
                )
                VALUES (%s, %s, %s, %s, %s)
                """,
                (profile_id, title, json.dumps(report_json), markdown, len(entries)),
            )
        await conn.commit()

    logger.info("Generated report for %s with %d candidates", profile_name, len(entries))


async def run(settings: BotSettings) -> None:
    runner = BotRunner(settings, QUEUE_REPORT)

    async def handle(job: dict) -> None:
        profile_id = job.get("investor_profile_id")

        async with await psycopg.AsyncConnection.connect(settings.database_url) as conn:
            async with conn.cursor() as cur:
                if profile_id:
                    await cur.execute(
                        """
                        SELECT id, name, categories, min_score, tlds, excluded_keywords
                        FROM investor_profiles WHERE id = %s AND active = TRUE
                        """,
                        (profile_id,),
                    )
                    profiles = await cur.fetchall()
                else:
                    await cur.execute(
                        """
                        SELECT id, name, categories, min_score, tlds, excluded_keywords
                        FROM investor_profiles WHERE active = TRUE
                        """
                    )
                    profiles = await cur.fetchall()

        only_available = job.get("only_available_com", True)
        for row in profiles:
            pid, name, categories, min_score, tlds, excluded = row
            await _generate_for_profile(
                settings,
                str(pid),
                name,
                categories or [],
                float(min_score),
                tlds or ["com"],
                excluded or [],
                only_available,
            )

    async def schedule_reports() -> None:
        while True:
            await handle({})
            await asyncio.sleep(settings.report_interval_minutes * 60)

    await asyncio.gather(
        runner.start(handle),
        schedule_reports(),
    )
