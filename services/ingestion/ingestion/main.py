"""CertStream ingestion: filter CT logs and enqueue monitoring candidates."""

from __future__ import annotations

import asyncio
import json
import logging
import signal
import threading
from queue import Empty, Queue

import certstream
import redis.asyncio as redis

from ingestion.config import QUEUE_EXTRACT_KEYWORDS, QUEUE_POLL, Settings
from ingestion.parser import parse_certificate_name
from ingestion.registrar import RegistrarClient
from ingestion.store import CandidateStore

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ingestion")


class IngestionService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._store = CandidateStore(settings.database_url)
        self._registrar = RegistrarClient(settings)
        self._domain_queue: Queue[str] = Queue(maxsize=10_000)
        self._seen: set[str] = set()
        self._running = True

    async def start(self) -> None:
        redis_client = redis.from_url(self._settings.redis_url, decode_responses=True)
        await redis_client.ping()

        logger.info(
            "Ingestion started — watching suffixes: %s",
            ", ".join(self._settings.target_suffixes),
        )

        loop = asyncio.get_running_loop()

        def certstream_callback(message: dict, _context: dict) -> None:
            if not self._running or message.get("message_type") != "certificate_update":
                return
            data = message.get("data", {})
            leaf_cert = data.get("leaf_cert", {})
            for domain in leaf_cert.get("all_domains") or []:
                try:
                    self._domain_queue.put_nowait(domain)
                except Exception:
                    pass

        certstream_thread = threading.Thread(
            target=lambda: certstream.listen_for_events(
                certstream_callback,
                url=self._settings.certstream_url,
                skip_heartbeats=True,
            ),
            daemon=True,
        )
        certstream_thread.start()

        try:
            while self._running:
                try:
                    domain = await loop.run_in_executor(
                        None, lambda: self._domain_queue.get(timeout=1.0)
                    )
                except Empty:
                    continue
                await self._process_domain(domain, redis_client)
        finally:
            self._store.close()
            await redis_client.aclose()

    def stop(self) -> None:
        self._running = False
        self._store.close()

    async def _process_domain(self, domain: str, redis_client: redis.Redis) -> None:
        parsed = parse_certificate_name(domain, self._settings.target_suffixes)
        if not parsed:
            return

        dedupe_key = f"{parsed.platform}:{parsed.project_slug}"
        if dedupe_key in self._seen:
            return
        self._seen.add(dedupe_key)

        com_available = await self._registrar.check_com_available(parsed.com_domain)
        if com_available is False:
            logger.debug("Skipping %s — .com already registered", parsed.com_domain)
            return

        candidate_id = self._store.upsert_discovered(parsed, com_available)
        if not candidate_id:
            return

        logger.info(
            "New candidate: %s (%s) -> %s [com_available=%s]",
            parsed.project_slug,
            parsed.platform,
            parsed.com_domain,
            com_available,
        )

        job_payload = json.dumps(
            {"candidate_id": candidate_id, "deploy_url": parsed.deploy_url}
        )
        await redis_client.lpush(QUEUE_POLL, job_payload)
        await redis_client.lpush(QUEUE_EXTRACT_KEYWORDS, job_payload)


def main() -> None:
    settings = Settings.from_env()
    service = IngestionService(settings)

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    if hasattr(signal, "SIGINT"):
        try:
            loop.add_signal_handler(signal.SIGINT, service.stop)
            if hasattr(signal, "SIGTERM"):
                loop.add_signal_handler(signal.SIGTERM, service.stop)
        except NotImplementedError:
            pass  # Windows

    try:
        loop.run_until_complete(service.start())
    finally:
        loop.close()


if __name__ == "__main__":
    main()
