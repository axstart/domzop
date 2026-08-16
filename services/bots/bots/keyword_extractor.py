"""Keyword extraction bot — pulls keywords from slugs and page metadata."""

from __future__ import annotations

import json
import logging
import re

import httpx
import psycopg
from bs4 import BeautifulSoup

from bots.common import BotRunner
from bots.config import QUEUE_EXTRACT_KEYWORDS, QUEUE_RESEARCH, BotSettings

logger = logging.getLogger("bots.keyword_extractor")

STOP_WORDS = frozenset(
    "a an the and or for to of in on at by with from is are was were be been being "
    "app web site page home new get set use our your my the".split()
)

SLUG_SPLIT = re.compile(r"[-_]+")


def _tokenize_slug(slug: str) -> list[tuple[str, float]]:
    """Split slug into weighted keyword tokens."""
    tokens: list[tuple[str, float]] = []
    for part in SLUG_SPLIT.split(slug.lower()):
        part = re.sub(r"[^a-z0-9]", "", part)
        if len(part) >= 3 and part not in STOP_WORDS:
            tokens.append((part, 2.0))
    return tokens


def _extract_from_html(html: str) -> list[tuple[str, float, str]]:
    """Extract keywords from title, meta, and headings."""
    soup = BeautifulSoup(html, "lxml")
    results: list[tuple[str, float, str]] = []

    title = soup.find("title")
    if title and title.string:
        for token in _tokenize_slug(title.string.replace(" ", "-")):
            results.append((token[0], 1.5, "title"))

    for meta in soup.find_all("meta"):
        name = (meta.get("name") or meta.get("property") or "").lower()
        content = meta.get("content", "")
        if name in ("description", "keywords", "og:title", "og:description") and content:
            for token in _tokenize_slug(content.replace(" ", "-")):
                results.append((token[0], 1.2, "meta"))

    for tag in soup.find_all(["h1", "h2", "h3"]):
        text = tag.get_text(strip=True)
        if text:
            for token in _tokenize_slug(text.replace(" ", "-")):
                results.append((token[0], 1.0, tag.name))

    return results


async def run(settings: BotSettings) -> None:
    runner = BotRunner(settings, QUEUE_EXTRACT_KEYWORDS)

    async def handle(job: dict) -> None:
        candidate_id = job["candidate_id"]
        deploy_url = job.get("deploy_url", "")

        async with await psycopg.AsyncConnection.connect(settings.database_url) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT project_slug, deploy_url FROM candidates WHERE id = %s",
                    (candidate_id,),
                )
                row = await cur.fetchone()
                if not row:
                    return
                slug, url = row[0], row[1] or deploy_url

        keywords: dict[str, tuple[float, str]] = {}
        for token, weight in _tokenize_slug(slug):
            keywords[token] = (max(keywords.get(token, (0, ""))[0], weight), "slug")

        try:
            async with httpx.AsyncClient(
                timeout=15.0,
                follow_redirects=True,
                headers={"User-Agent": "domzop-research-lab/1.0"},
            ) as client:
                response = await client.get(url)
                if response.status_code < 400:
                    for token, weight, source in _extract_from_html(response.text):
                        prev = keywords.get(token, (0, ""))
                        keywords[token] = (max(prev[0], weight), source)
        except Exception as exc:
            logger.debug("Page fetch failed for %s: %s", url, exc)

        async with await psycopg.AsyncConnection.connect(settings.database_url) as conn:
            async with conn.cursor() as cur:
                for keyword, (weight, source) in keywords.items():
                    await cur.execute(
                        """
                        INSERT INTO keywords (candidate_id, keyword, source, weight)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (candidate_id, keyword) DO UPDATE
                        SET weight = GREATEST(keywords.weight, EXCLUDED.weight),
                            source = EXCLUDED.source
                        """,
                        (candidate_id, keyword, source, weight),
                    )
            await conn.commit()

        logger.info("Extracted %d keywords for candidate %s", len(keywords), candidate_id)
        await runner.enqueue(QUEUE_RESEARCH, {"candidate_id": candidate_id})

    await runner.start(handle)
