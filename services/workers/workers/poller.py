"""Site polling: bundle hashes, DOM fingerprint, network payloads."""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse

import httpx
from playwright.async_api import async_playwright


@dataclass
class PollResult:
    http_status: int | None
    bundle_hashes: list[str]
    dom_hash: str | None
    payload_fingerprint: str | None
    screenshot_path: str | None
    raw_metadata: dict


SCRIPT_HASH_RE = re.compile(r"/_next/static/[^\"']+/(_app|main|webpack)-[a-f0-9]+\.js")


class SitePoller:
    def __init__(self, screenshots_dir: str) -> None:
        self._screenshots_dir = Path(screenshots_dir)
        self._screenshots_dir.mkdir(parents=True, exist_ok=True)

    async def poll(self, deploy_url: str, candidate_id: str) -> PollResult:
        bundle_hashes: list[str] = []
        dom_hash: str | None = None
        payload_fingerprint: str | None = None
        screenshot_path: str | None = None
        http_status: int | None = None
        raw_metadata: dict = {}

        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            try:
                response = await client.get(deploy_url)
                http_status = response.status_code
                html = response.text
                raw_metadata["content_length"] = len(html)

                for match in SCRIPT_HASH_RE.findall(html):
                    bundle_hashes.append(match)

                dom_hash = hashlib.sha256(html.encode()).hexdigest()[:16]
            except httpx.HTTPError as exc:
                raw_metadata["http_error"] = str(exc)

        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                resources: list[str] = []

                async def on_response(response):
                    url = response.url
                    if any(ext in url for ext in (".js", ".css", ".json")):
                        resources.append(url)

                page.on("response", on_response)

                await page.goto(deploy_url, wait_until="networkidle", timeout=45000)
                slug = urlparse(deploy_url).netloc.split(".")[0]
                shot_file = self._screenshots_dir / f"{candidate_id}_{slug}.png"
                await page.screenshot(path=str(shot_file), full_page=True)
                screenshot_path = str(shot_file)

                payload_fingerprint = hashlib.sha256(
                    json.dumps(sorted(resources), sort_keys=True).encode()
                ).hexdigest()[:16]

                await browser.close()
        except Exception as exc:
            raw_metadata["playwright_error"] = str(exc)

        return PollResult(
            http_status=http_status,
            bundle_hashes=bundle_hashes,
            dom_hash=dom_hash,
            payload_fingerprint=payload_fingerprint,
            screenshot_path=screenshot_path,
            raw_metadata=raw_metadata,
        )
