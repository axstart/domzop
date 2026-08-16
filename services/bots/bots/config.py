"""Bot configuration and queue constants."""

from __future__ import annotations

import os
from dataclasses import dataclass

QUEUE_DISCOVERY = "queue:discovery"
QUEUE_POLL = "queue:poll"
QUEUE_EXTRACT_KEYWORDS = "queue:extract_keywords"
QUEUE_RESEARCH = "queue:research"
QUEUE_AVAILABILITY = "queue:availability"
QUEUE_SCORE = "queue:score"
QUEUE_REPORT = "queue:report"
QUEUE_EVALUATE = "queue:evaluate"
QUEUE_PURCHASE = "queue:purchase"

ALL_QUEUES = (
    QUEUE_DISCOVERY,
    QUEUE_POLL,
    QUEUE_EXTRACT_KEYWORDS,
    QUEUE_RESEARCH,
    QUEUE_AVAILABILITY,
    QUEUE_SCORE,
    QUEUE_REPORT,
    QUEUE_EVALUATE,
    QUEUE_PURCHASE,
)


@dataclass(frozen=True)
class BotSettings:
    database_url: str
    redis_url: str
    bot_name: str
    namecheap_api_user: str
    namecheap_api_key: str
    namecheap_client_ip: str
    namecheap_sandbox: bool
    openai_api_key: str
    report_interval_minutes: int

    @classmethod
    def from_env(cls) -> BotSettings:
        return cls(
            database_url=os.environ["DATABASE_URL"],
            redis_url=os.environ.get("REDIS_URL", "redis://localhost:6379/0"),
            bot_name=os.environ.get("BOT_NAME", "keyword-extractor"),
            namecheap_api_user=os.getenv("NAMECHEAP_API_USER", ""),
            namecheap_api_key=os.getenv("NAMECHEAP_API_KEY", ""),
            namecheap_client_ip=os.getenv("NAMECHEAP_CLIENT_IP", ""),
            namecheap_sandbox=os.getenv("NAMECHEAP_SANDBOX", "true").lower() == "true",
            openai_api_key=os.getenv("OPENAI_API_KEY", ""),
            report_interval_minutes=int(os.getenv("REPORT_INTERVAL_MINUTES", "60")),
        )
