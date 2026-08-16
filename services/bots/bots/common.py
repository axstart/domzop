"""Shared bot utilities: queue consumer, job tracking, registrar client."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Callable, Coroutine

import httpx
import psycopg
import redis.asyncio as redis
import xml.etree.ElementTree as ET

from bots.config import BotSettings

logger = logging.getLogger("bots")

NS = {"nc": "http://api.namecheap.com/xml.response"}


class RegistrarClient:
    """Namecheap domain availability checker (adapted from ingestion service)."""

    def __init__(self, settings: BotSettings) -> None:
        self._settings = settings
        self._base = (
            "https://api.sandbox.namecheap.com/xml.response"
            if settings.namecheap_sandbox
            else "https://api.namecheap.com/xml.response"
        )

    def is_configured(self) -> bool:
        return bool(
            self._settings.namecheap_api_user
            and self._settings.namecheap_api_key
            and self._settings.namecheap_client_ip
        )

    async def check_domains(self, domains: list[str]) -> dict[str, bool | None]:
        if not domains:
            return {}
        if not self.is_configured():
            return {d: None for d in domains}

        params = {
            "ApiUser": self._settings.namecheap_api_user,
            "ApiKey": self._settings.namecheap_api_key,
            "UserName": self._settings.namecheap_api_user,
            "ClientIp": self._settings.namecheap_client_ip,
            "Command": "namecheap.domains.check",
            "DomainList": ",".join(domains[:50]),
        }

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(self._base, params=params)
                response.raise_for_status()
            root = ET.fromstring(response.text)
            if root.attrib.get("Status") != "OK":
                return {d: None for d in domains}

            results: dict[str, bool | None] = {d: None for d in domains}
            for result in root.findall(".//nc:DomainCheckResult", NS):
                domain = result.attrib.get("Domain", "")
                results[domain] = result.attrib.get("Available", "").lower() == "true"
            return results
        except Exception as exc:
            logger.warning("Registrar check failed: %s", exc)
            return {d: None for d in domains}


class BotRunner:
    """Base queue consumer with bot_runs / bot_jobs tracking."""

    def __init__(self, settings: BotSettings, queue_name: str) -> None:
        self._settings = settings
        self._queue_name = queue_name
        self._redis: redis.Redis | None = None
        self._run_id: str | None = None
        self._jobs_processed = 0
        self._jobs_failed = 0

    async def start(
        self,
        handler: Callable[[dict[str, Any]], Coroutine[Any, Any, None]],
    ) -> None:
        self._redis = redis.from_url(self._settings.redis_url, decode_responses=True)
        await self._redis.ping()
        self._run_id = await self._start_run()
        logger.info("Bot %s started on %s", self._settings.bot_name, self._queue_name)

        try:
            while True:
                assert self._redis
                result = await self._redis.brpop(self._queue_name, timeout=5)
                if not result:
                    continue
                _, payload = result
                job = json.loads(payload)
                await self._process_job(handler, job)
        finally:
            await self._complete_run()

    async def _process_job(
        self,
        handler: Callable[[dict[str, Any]], Coroutine[Any, Any, None]],
        job: dict[str, Any],
    ) -> None:
        job_id = await self._create_job(job)
        try:
            await handler(job)
            await self._finish_job(job_id, success=True)
            self._jobs_processed += 1
            if self._run_id:
                await self._update_run_counts()
        except Exception as exc:
            logger.exception("Job failed: %s", exc)
            await self._finish_job(job_id, success=False, error=str(exc))
            self._jobs_failed += 1
            if self._run_id:
                await self._update_run_counts()

    async def enqueue(self, queue: str, payload: dict[str, Any]) -> None:
        assert self._redis
        await self._redis.lpush(queue, json.dumps(payload))

    async def _start_run(self) -> str:
        async with await psycopg.AsyncConnection.connect(self._settings.database_url) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    INSERT INTO bot_runs (bot_name, status, started_at)
                    VALUES (%s, 'running', NOW())
                    RETURNING id
                    """,
                    (self._settings.bot_name,),
                )
                row = await cur.fetchone()
            await conn.commit()
        return str(row[0])

    async def _complete_run(self) -> None:
        if not self._run_id:
            return
        async with await psycopg.AsyncConnection.connect(self._settings.database_url) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    UPDATE bot_runs
                    SET status = 'completed', completed_at = NOW(),
                        jobs_processed = %s, jobs_failed = %s
                    WHERE id = %s
                    """,
                    (self._jobs_processed, self._jobs_failed, self._run_id),
                )
            await conn.commit()

    async def _update_run_counts(self) -> None:
        async with await psycopg.AsyncConnection.connect(self._settings.database_url) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    UPDATE bot_runs
                    SET jobs_processed = %s, jobs_failed = %s
                    WHERE id = %s
                    """,
                    (self._jobs_processed, self._jobs_failed, self._run_id),
                )
            await conn.commit()

    async def _create_job(self, job: dict[str, Any]) -> str:
        async with await psycopg.AsyncConnection.connect(self._settings.database_url) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    INSERT INTO bot_jobs (bot_run_id, queue_name, payload, status, candidate_id, started_at)
                    VALUES (%s, %s, %s, 'running', %s, NOW())
                    RETURNING id
                    """,
                    (
                        self._run_id,
                        self._queue_name,
                        json.dumps(job),
                        job.get("candidate_id"),
                    ),
                )
                row = await cur.fetchone()
            await conn.commit()
        return str(row[0])

    async def _finish_job(self, job_id: str, *, success: bool, error: str = "") -> None:
        status = "completed" if success else "failed"
        async with await psycopg.AsyncConnection.connect(self._settings.database_url) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    UPDATE bot_jobs
                    SET status = %s, completed_at = NOW(), error_message = %s
                    WHERE id = %s
                    """,
                    (status, error or None, job_id),
                )
            await conn.commit()
