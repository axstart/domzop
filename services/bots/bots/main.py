"""Bot dispatcher — run a single bot by BOT_NAME env var."""

from __future__ import annotations

import asyncio
import logging
import sys

from bots.availability import run as run_availability
from bots.config import BotSettings
from bots.keyword_extractor import run as run_keyword_extractor
from bots.report import run as run_report
from bots.research import run as run_research
from bots.scoring import run as run_scoring

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

BOTS = {
    "keyword-extractor": run_keyword_extractor,
    "research": run_research,
    "availability": run_availability,
    "scoring": run_scoring,
    "report": run_report,
}


def main() -> None:
    settings = BotSettings.from_env()
    handler = BOTS.get(settings.bot_name)
    if not handler:
        print(f"Unknown BOT_NAME={settings.bot_name}. Choose from: {', '.join(BOTS)}")
        sys.exit(1)
    asyncio.run(handler(settings))


if __name__ == "__main__":
    main()
