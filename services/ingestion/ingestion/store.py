"""PostgreSQL persistence for discovered candidates."""

from __future__ import annotations

from contextlib import contextmanager
from typing import Generator

import psycopg
from psycopg_pool import ConnectionPool

from ingestion.parser import ParsedCandidate


class CandidateStore:
    def __init__(self, database_url: str) -> None:
        self._pool = ConnectionPool(database_url, min_size=1, max_size=5)

    @contextmanager
    def connection(self) -> Generator[psycopg.Connection, None, None]:
        with self._pool.connection() as conn:
            yield conn

    def upsert_discovered(
        self,
        candidate: ParsedCandidate,
        com_available: bool | None,
    ) -> str | None:
        """Insert candidate if new. Returns candidate id or None if duplicate."""
        with self.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO candidates (
                      project_slug, platform, deploy_url, com_domain,
                      com_available, status, monitoring_started_at
                    )
                    VALUES (%s, %s, %s, %s, %s, 'monitoring', NOW())
                    ON CONFLICT (platform, project_slug) DO NOTHING
                    RETURNING id
                    """,
                    (
                        candidate.project_slug,
                        candidate.platform,
                        candidate.deploy_url,
                        candidate.com_domain,
                        com_available,
                    ),
                )
                row = cur.fetchone()
                conn.commit()
                return str(row[0]) if row else None

    def close(self) -> None:
        self._pool.close()
