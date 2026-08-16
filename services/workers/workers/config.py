"""Worker configuration."""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class WorkerSettings:
    database_url: str
    redis_url: str
    poll_interval_hours: int
    quality_score_threshold: float
    quality_eval_min_days: int
    quality_eval_max_days: int
    max_monitoring_days: int
    openai_api_key: str
    auto_purchase_enabled: bool
    max_purchase_price_usd: float
    screenshots_dir: str

    @classmethod
    def from_env(cls) -> WorkerSettings:
        return cls(
            database_url=os.environ["DATABASE_URL"],
            redis_url=os.environ.get("REDIS_URL", "redis://localhost:6379/0"),
            poll_interval_hours=int(os.getenv("POLL_INTERVAL_HOURS", "24")),
            quality_score_threshold=float(os.getenv("QUALITY_SCORE_THRESHOLD", "75")),
            quality_eval_min_days=int(os.getenv("QUALITY_EVAL_MIN_DAYS", "3")),
            quality_eval_max_days=int(os.getenv("QUALITY_EVAL_MAX_DAYS", "5")),
            max_monitoring_days=int(os.getenv("MAX_MONITORING_DAYS", "14")),
            openai_api_key=os.getenv("OPENAI_API_KEY", ""),
            auto_purchase_enabled=os.getenv("AUTO_PURCHASE_ENABLED", "false").lower() == "true",
            max_purchase_price_usd=float(os.getenv("MAX_PURCHASE_PRICE_USD", "12")),
            screenshots_dir=os.getenv("SCREENSHOTS_DIR", "/app/screenshots"),
        )


QUEUE_POLL = "queue:poll"
QUEUE_EVALUATE = "queue:evaluate"
QUEUE_PURCHASE = "queue:purchase"
