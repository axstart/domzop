"""Background worker: poll, evaluate, purchase queue processing."""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone

import psycopg
import redis.asyncio as redis

from workers.config import (
    QUEUE_EVALUATE,
    QUEUE_POLL,
    QUEUE_PURCHASE,
    WorkerSettings,
)
from workers.poller import SitePoller
from workers.quality import QualityEvaluator

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("workers")


class WorkerService:
    def __init__(self, settings: WorkerSettings) -> None:
        self._settings = settings
        self._poller = SitePoller(settings.screenshots_dir)
        self._evaluator = QualityEvaluator(settings.openai_api_key)
        self._redis: redis.Redis | None = None

    async def start(self) -> None:
        self._redis = redis.from_url(self._settings.redis_url, decode_responses=True)
        await self._redis.ping()
        logger.info("Worker started")

        await asyncio.gather(
            self._consume_queue(QUEUE_POLL, self._handle_poll),
            self._consume_queue(QUEUE_EVALUATE, self._handle_evaluate),
            self._consume_queue(QUEUE_PURCHASE, self._handle_purchase),
            self._schedule_due_polls(),
        )

    async def _consume_queue(self, queue: str, handler) -> None:
        assert self._redis
        while True:
            _, payload = await self._redis.brpop(queue, timeout=5)
            if payload:
                await handler(json.loads(payload))

    async def _schedule_due_polls(self) -> None:
        """Re-enqueue monitoring candidates whose poll interval has elapsed."""
        assert self._redis
        interval = timedelta(hours=self._settings.poll_interval_hours)

        while True:
            async with await psycopg.AsyncConnection.connect(self._settings.database_url) as conn:
                async with conn.cursor() as cur:
                    await cur.execute(
                        """
                        SELECT c.id, c.deploy_url
                        FROM candidates c
                        LEFT JOIN LATERAL (
                          SELECT polled_at FROM poll_snapshots ps
                          WHERE ps.candidate_id = c.id
                          ORDER BY polled_at DESC LIMIT 1
                        ) latest ON TRUE
                        WHERE c.status = 'monitoring'
                          AND (
                            latest.polled_at IS NULL
                            OR latest.polled_at < NOW() - %s::interval
                          )
                        """,
                        (f"{self._settings.poll_interval_hours} hours",),
                    )
                    rows = await cur.fetchall()

            for candidate_id, deploy_url in rows:
                await self._redis.lpush(
                    QUEUE_POLL,
                    json.dumps({"candidate_id": str(candidate_id), "deploy_url": deploy_url}),
                )

            await asyncio.sleep(300)

    async def _handle_poll(self, job: dict) -> None:
        candidate_id = job["candidate_id"]
        deploy_url = job["deploy_url"]
        logger.info("Polling %s", deploy_url)

        result = await self._poller.poll(deploy_url, candidate_id)

        async with await psycopg.AsyncConnection.connect(self._settings.database_url) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    INSERT INTO poll_snapshots (
                      candidate_id, http_status, bundle_hashes, dom_hash,
                      payload_fingerprint, screenshot_path, raw_metadata
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        candidate_id,
                        result.http_status,
                        json.dumps(result.bundle_hashes),
                        result.dom_hash,
                        result.payload_fingerprint,
                        result.screenshot_path,
                        json.dumps(result.raw_metadata),
                    ),
                )

                if result.http_status and result.http_status >= 400:
                    await self._discard(cur, candidate_id, "site_unreachable")
                    await conn.commit()
                    return

                await cur.execute(
                    """
                    SELECT COUNT(DISTINCT dom_hash) AS change_days
                    FROM poll_snapshots WHERE candidate_id = %s
                    """,
                    (candidate_id,),
                )
                row = await cur.fetchone()
                change_days = row[0] if row else 0

                await cur.execute(
                    "SELECT monitoring_started_at FROM candidates WHERE id = %s",
                    (candidate_id,),
                )
                started_row = await cur.fetchone()
                monitoring_started = started_row[0] if started_row else None

                if monitoring_started:
                    days_monitored = (datetime.now(timezone.utc) - monitoring_started).days
                    if days_monitored >= self._settings.max_monitoring_days and change_days < 2:
                        await self._discard(cur, candidate_id, "no_activity")
                    elif (
                        self._settings.quality_eval_min_days
                        <= days_monitored
                        <= self._settings.quality_eval_max_days
                        and change_days >= 2
                    ):
                        assert self._redis
                        await self._redis.lpush(
                            QUEUE_EVALUATE,
                            json.dumps({"candidate_id": candidate_id}),
                        )

            await conn.commit()

    async def _handle_evaluate(self, job: dict) -> None:
        candidate_id = job["candidate_id"]
        logger.info("Evaluating candidate %s", candidate_id)

        async with await psycopg.AsyncConnection.connect(self._settings.database_url) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT screenshot_path, com_domain FROM candidates c
                    LEFT JOIN LATERAL (
                      SELECT screenshot_path FROM poll_snapshots ps
                      WHERE ps.candidate_id = c.id AND screenshot_path IS NOT NULL
                      ORDER BY polled_at DESC LIMIT 1
                    ) snap ON TRUE
                    WHERE c.id = %s
                    """,
                    (candidate_id,),
                )
                row = await cur.fetchone()
                if not row or not row[0]:
                    return

                screenshot_path, com_domain = row
                score, notes = await self._evaluator.evaluate(screenshot_path)

                if score is None:
                    logger.warning("Quality eval skipped: %s", notes)
                    return

                await cur.execute(
                    """
                    UPDATE candidates
                    SET status = 'evaluated', quality_score = %s, quality_notes = %s, evaluated_at = NOW()
                    WHERE id = %s
                    """,
                    (score, notes, candidate_id),
                )

                if score >= self._settings.quality_score_threshold:
                    if self._settings.auto_purchase_enabled:
                        assert self._redis
                        await self._redis.lpush(
                            QUEUE_PURCHASE,
                            json.dumps({"candidate_id": candidate_id, "domain": com_domain}),
                        )
                else:
                    await self._discard(cur, candidate_id, "low_quality_score")

            await conn.commit()

    async def _handle_purchase(self, job: dict) -> None:
        candidate_id = job["candidate_id"]
        domain = job["domain"]
        manual = bool(job.get("manual"))
        logger.info(
            "Purchase queued for %s (auto=%s manual=%s)",
            domain,
            self._settings.auto_purchase_enabled,
            manual,
        )

        # Registrar purchase integration stub — wire Namecheap domains.create in production
        async with await psycopg.AsyncConnection.connect(self._settings.database_url) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    INSERT INTO purchases (candidate_id, domain, price_usd, success, error_message)
                    VALUES (%s, %s, %s, FALSE, %s)
                    """,
                    (
                        candidate_id,
                        domain,
                        self._settings.max_purchase_price_usd,
                        "Automated purchase not yet wired — use admin dashboard",
                    ),
                )
                if manual:
                    await cur.execute(
                        """
                        UPDATE candidates
                        SET status = 'purchased', purchased_at = COALESCE(purchased_at, NOW())
                        WHERE id = %s
                        """,
                        (candidate_id,),
                    )
                    await cur.execute(
                        "SELECT upsert_domain_asset_from_candidate(%s)",
                        (candidate_id,),
                    )
            await conn.commit()

    async def _discard(self, cur, candidate_id: str, reason: str) -> None:
        await cur.execute(
            """
            UPDATE candidates
            SET status = 'discarded', discard_reason = %s, discarded_at = NOW()
            WHERE id = %s
            """,
            (reason, candidate_id),
        )


def main() -> None:
    settings = WorkerSettings.from_env()
    asyncio.run(WorkerService(settings).start())


if __name__ == "__main__":
    main()
