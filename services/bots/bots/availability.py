"""Availability bot — batch domain availability checks via registrar API."""

from __future__ import annotations

import logging

import psycopg

from bots.common import BotRunner, RegistrarClient
from bots.config import QUEUE_AVAILABILITY, QUEUE_SCORE, BotSettings

logger = logging.getLogger("bots.availability")

OPTIONAL_TLDS = ("com", "io", "co", "app", "dev")


async def run(settings: BotSettings) -> None:
    runner = BotRunner(settings, QUEUE_AVAILABILITY)
    registrar = RegistrarClient(settings)

    async def handle(job: dict) -> None:
        candidate_id = job["candidate_id"]

        async with await psycopg.AsyncConnection.connect(settings.database_url) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT project_slug, com_domain FROM candidates WHERE id = %s",
                    (candidate_id,),
                )
                row = await cur.fetchone()
                if not row:
                    return
                slug, com_domain = row[0], row[1]

                domains_to_check = [com_domain]
                for tld in OPTIONAL_TLDS:
                    if tld != "com":
                        domains_to_check.append(f"{slug}.{tld}")

                availability = await registrar.check_domains(domains_to_check)

                com_available = availability.get(com_domain)
                for domain, available in availability.items():
                    tld = domain.rsplit(".", 1)[-1]
                    await cur.execute(
                        """
                        INSERT INTO domain_availability (candidate_id, domain, tld, available)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (candidate_id, domain) DO UPDATE
                        SET available = EXCLUDED.available, checked_at = NOW()
                        """,
                        (candidate_id, domain, tld, available),
                    )

                if com_available is not None:
                    await cur.execute(
                        "UPDATE candidates SET com_available = %s WHERE id = %s",
                        (com_available, candidate_id),
                    )
            await conn.commit()

        logger.info(
            "Availability check for %s: com=%s",
            candidate_id,
            availability.get(com_domain),
        )
        await runner.enqueue(QUEUE_SCORE, {"candidate_id": candidate_id})

    await runner.start(handle)
