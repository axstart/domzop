"""Shared configuration for Wait & See services."""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    database_url: str
    redis_url: str
    certstream_url: str
    target_suffixes: tuple[str, ...]
    namecheap_api_user: str
    namecheap_api_key: str
    namecheap_client_ip: str
    namecheap_sandbox: bool

    @classmethod
    def from_env(cls) -> Settings:
        suffixes = os.getenv(
            "TARGET_SUFFIXES",
            ".vercel.app,.netlify.app,.onrender.com",
        )
        return cls(
            database_url=os.environ["DATABASE_URL"],
            redis_url=os.environ.get("REDIS_URL", "redis://localhost:6379/0"),
            certstream_url=os.getenv(
                "CERTSTREAM_URL",
                "wss://certstream.calidog.io/",
            ),
            target_suffixes=tuple(s.strip() for s in suffixes.split(",") if s.strip()),
            namecheap_api_user=os.getenv("NAMECHEAP_API_USER", ""),
            namecheap_api_key=os.getenv("NAMECHEAP_API_KEY", ""),
            namecheap_client_ip=os.getenv("NAMECHEAP_CLIENT_IP", ""),
            namecheap_sandbox=os.getenv("NAMECHEAP_SANDBOX", "true").lower() == "true",
        )


PLATFORM_SUFFIX_MAP = {
    ".vercel.app": "vercel",
    ".netlify.app": "netlify",
    ".onrender.com": "onrender",
}

QUEUE_DISCOVERY = "queue:discovery"
QUEUE_POLL = "queue:poll"
QUEUE_EXTRACT_KEYWORDS = "queue:extract_keywords"
QUEUE_RESEARCH = "queue:research"
QUEUE_AVAILABILITY = "queue:availability"
QUEUE_SCORE = "queue:score"
QUEUE_REPORT = "queue:report"
QUEUE_EVALUATE = "queue:evaluate"
QUEUE_PURCHASE = "queue:purchase"
