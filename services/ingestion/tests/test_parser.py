"""Tests for certificate name parsing."""

import pytest

from ingestion.parser import parse_certificate_name

SUFFIXES = (".vercel.app", ".netlify.app", ".onrender.com")


@pytest.mark.parametrize(
    "domain,expected_slug,expected_platform",
    [
        ("my-saas.vercel.app", "my-saas", "vercel"),
        ("*.my-saas.vercel.app", "my-saas", "vercel"),
        ("cool-app.netlify.app", "cool-app", "netlify"),
        ("api-server.onrender.com", "api-server", "onrender"),
    ],
)
def test_parse_valid_domains(domain, expected_slug, expected_platform):
    result = parse_certificate_name(domain, SUFFIXES)
    assert result is not None
    assert result.project_slug == expected_slug
    assert result.platform == expected_platform
    assert result.com_domain == f"{expected_slug}.com"


@pytest.mark.parametrize(
    "domain",
    [
        "sub.app.vercel.app",
        "google.com",
        "x.vercel.app",
        "",
    ],
)
def test_parse_invalid_domains(domain):
    assert parse_certificate_name(domain, SUFFIXES) is None
