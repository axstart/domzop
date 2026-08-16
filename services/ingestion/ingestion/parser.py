"""Extract project metadata from CT log certificate names."""

from __future__ import annotations

import re
from dataclasses import dataclass

from ingestion.config import PLATFORM_SUFFIX_MAP

WILDCARD_PREFIX = "*."


@dataclass(frozen=True)
class ParsedCandidate:
    project_slug: str
    platform: str
    deploy_url: str
    com_domain: str


def parse_certificate_name(name: str, target_suffixes: tuple[str, ...]) -> ParsedCandidate | None:
    normalized = name.lower().strip()
    if normalized.startswith(WILDCARD_PREFIX):
        normalized = normalized[len(WILDCARD_PREFIX) :]

    for suffix in target_suffixes:
        if not normalized.endswith(suffix):
            continue

        platform = PLATFORM_SUFFIX_MAP.get(suffix)
        if not platform:
            continue

        host = normalized
        slug = host[: -len(suffix)]
        if not slug or "." in slug:
            # Skip nested subdomains; we want base project slugs only
            continue

        slug = re.sub(r"[^a-z0-9-]", "-", slug).strip("-")
        if len(slug) < 2:
            continue

        return ParsedCandidate(
            project_slug=slug,
            platform=platform,
            deploy_url=f"https://{host}",
            com_domain=f"{slug}.com",
        )

    return None
