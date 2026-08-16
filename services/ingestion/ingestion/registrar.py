"""Namecheap domain availability pre-check."""

from __future__ import annotations

import xml.etree.ElementTree as ET

import httpx

from ingestion.config import Settings

NS = {"nc": "http://api.namecheap.com/xml.response"}


class RegistrarClient:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._base = (
            "https://api.sandbox.namecheap.com/xml.response"
            if settings.namecheap_sandbox
            else "https://api.namecheap.com/xml.response"
        )

    def is_configured(self) -> bool:
        return bool(
            self._settings.namecheap_api_user
            and self._settings.namecheap_api_key
            and self._settings.namecheap_client_ip
        )

    async def check_com_available(self, domain: str) -> bool | None:
        """Return True if .com is available, False if taken, None if check skipped/failed."""
        if not self.is_configured():
            return None

        params = {
            "ApiUser": self._settings.namecheap_api_user,
            "ApiKey": self._settings.namecheap_api_key,
            "UserName": self._settings.namecheap_api_user,
            "ClientIp": self._settings.namecheap_client_ip,
            "Command": "namecheap.domains.check",
            "DomainList": domain,
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(self._base, params=params)
            response.raise_for_status()

        root = ET.fromstring(response.text)
        if root.attrib.get("Status") != "OK":
            return None

        result = root.find(".//nc:DomainCheckResult", NS)
        if result is None:
            return None

        return result.attrib.get("Available", "").lower() == "true"
