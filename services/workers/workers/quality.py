"""AI vision quality gate (day 3–5 evaluation)."""

from __future__ import annotations

import base64
from pathlib import Path

from openai import AsyncOpenAI

QUALITY_PROMPT = """You are evaluating whether a deployed web project looks production-ready
vs. a default template or abandoned WIP.

Score 0-100 where:
- 90+: Polished product UI, clear branding, real content
- 70-89: Solid MVP with intentional design choices
- 40-69: Generic template or sparse placeholder content
- 0-39: Broken, default boilerplate, or empty shell

Respond as JSON: {"score": number, "notes": "brief rationale"}"""


class QualityEvaluator:
    def __init__(self, api_key: str) -> None:
        self._client = AsyncOpenAI(api_key=api_key) if api_key else None

    def is_configured(self) -> bool:
        return self._client is not None

    async def evaluate(self, screenshot_path: str) -> tuple[float | None, str | None]:
        if not self._client:
            return None, "OpenAI API key not configured"

        path = Path(screenshot_path)
        if not path.exists():
            return None, "Screenshot not found"

        image_b64 = base64.b64encode(path.read_bytes()).decode()
        response = await self._client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": QUALITY_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/png;base64,{image_b64}"},
                        },
                        {"type": "text", "text": "Rate this deployment's production readiness."},
                    ],
                },
            ],
            response_format={"type": "json_object"},
            max_tokens=300,
        )

        import json

        content = response.choices[0].message.content or "{}"
        data = json.loads(content)
        return float(data.get("score", 0)), data.get("notes")
