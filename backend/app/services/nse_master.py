"""
NSE Master List Service
═══════════════════════
Fetches and caches the official list of all NSE-listed equities.
Source: https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv

This service provides the complete universe of Indian stocks — no hardcoding.
"""

import asyncio
import csv
import io
import logging
import time
from dataclasses import dataclass

import httpx

logger = logging.getLogger(__name__)

# ── NSE Official CSV ────────────────────────────────────────────────────────
NSE_EQUITY_CSV_URL = (
    "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv"
)

NSE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Referer": "https://www.nseindia.com/",
}

CACHE_TTL_SECONDS = 24 * 3600  # 24 hours

# ── Major Indian Market Indices (yfinance tickers) ──────────────────────────
INDIAN_INDICES: list[dict[str, str]] = [
    {"name": "NIFTY 50",       "symbol": "^NSEI"},
    {"name": "SENSEX",         "symbol": "^BSESN"},
    {"name": "NIFTY BANK",     "symbol": "^NSEBANK"},
    {"name": "NIFTY IT",       "symbol": "^CNXIT"},
    {"name": "NIFTY PHARMA",   "symbol": "^CNXPHARMA"},
    {"name": "NIFTY AUTO",     "symbol": "^CNXAUTO"},
    {"name": "NIFTY FMCG",     "symbol": "^CNXFMCG"},
    {"name": "NIFTY METAL",    "symbol": "^CNXMETAL"},
    {"name": "NIFTY ENERGY",   "symbol": "^CNXENERGY"},
    {"name": "NIFTY INFRA",    "symbol": "^CNXINFRA"},
    {"name": "NIFTY PSU BANK", "symbol": "^CNXPSUBANK"},
    {"name": "NIFTY REALTY",   "symbol": "^CNXREALTY"},
]


# ═════════════════════════════════════════════════════════════════════════════
# Data classes
# ═════════════════════════════════════════════════════════════════════════════

@dataclass
class NSECompany:
    """A single NSE-listed company."""

    symbol: str
    name: str
    series: str
    isin: str
    listing_date: str
    face_value: str

    @property
    def yf_symbol(self) -> str:
        """Yahoo Finance compatible symbol (e.g. RELIANCE.NS)."""
        return f"{self.symbol}.NS"


# ═════════════════════════════════════════════════════════════════════════════
# Module-level cache (singleton)
# ═════════════════════════════════════════════════════════════════════════════

_cache_companies: list[NSECompany] = []
_cache_timestamp: float = 0
_cache_lock = asyncio.Lock()
_name_lookup: dict[str, str] = {}  # "SYMBOL.NS" -> "Company Name"


# ═════════════════════════════════════════════════════════════════════════════
# Internal helpers
# ═════════════════════════════════════════════════════════════════════════════

async def _fetch_nse_csv() -> str:
    """Download the raw NSE equity CSV with browser-like headers."""
    async with httpx.AsyncClient(
        timeout=30,
        follow_redirects=True,
        headers=NSE_HEADERS,
    ) as client:
        # Visit NSE homepage first to get cookies (NSE blocks direct CSV access)
        try:
            await client.get("https://www.nseindia.com", headers=NSE_HEADERS)
        except Exception:
            pass  # Best-effort cookie fetch

        response = await client.get(NSE_EQUITY_CSV_URL)
        response.raise_for_status()
        return response.text


def _parse_nse_csv(raw_csv: str) -> list[NSECompany]:
    """Parse NSE equity CSV into list of NSECompany objects."""
    companies: list[NSECompany] = []
    reader = csv.DictReader(io.StringIO(raw_csv))

    for row in reader:
        # NSE CSV columns may have leading/trailing spaces
        symbol = (row.get("SYMBOL") or row.get(" SYMBOL", "")).strip()
        name = (
            row.get("NAME OF COMPANY") or row.get(" NAME OF COMPANY", "")
        ).strip()
        series = (row.get("SERIES") or row.get(" SERIES", "")).strip()
        isin = (
            row.get("ISIN NUMBER") or row.get(" ISIN NUMBER", "")
        ).strip()
        listing_date = (
            row.get("DATE OF LISTING") or row.get(" DATE OF LISTING", "")
        ).strip()
        face_value = (
            row.get("FACE VALUE") or row.get(" FACE VALUE", "")
        ).strip()

        if not symbol or not name:
            continue

        # Include all equity series (EQ = regular equity, BE = book-entry, etc.)
        if series and series not in ("EQ", "BE", "BZ", "SM", "ST", ""):
            continue

        companies.append(
            NSECompany(
                symbol=symbol,
                name=name,
                series=series,
                isin=isin,
                listing_date=listing_date,
                face_value=face_value,
            )
        )

    return companies


# ═════════════════════════════════════════════════════════════════════════════
# Public API
# ═════════════════════════════════════════════════════════════════════════════

async def refresh_nse_master() -> int:
    """
    Refresh the cached NSE company list from the official CSV.
    Returns the count of companies loaded, or 0 on failure.
    """
    global _cache_companies, _cache_timestamp, _name_lookup

    async with _cache_lock:
        try:
            raw = await _fetch_nse_csv()
            companies = _parse_nse_csv(raw)
            if companies:
                _cache_companies = companies
                _cache_timestamp = time.time()
                _name_lookup = {c.yf_symbol: c.name for c in companies}
                logger.info(
                    "NSE master list refreshed: %d companies loaded",
                    len(companies),
                )
                return len(companies)
            else:
                logger.warning("NSE CSV parsed but returned 0 companies")
                return 0
        except Exception as exc:
            logger.error("Failed to refresh NSE master list: %s", exc)
            return 0


async def _ensure_loaded():
    """Lazily load the master list if not cached or stale."""
    if not _cache_companies or (
        time.time() - _cache_timestamp > CACHE_TTL_SECONDS
    ):
        await refresh_nse_master()


async def get_all_companies() -> list[NSECompany]:
    """Get all NSE-listed companies (cached)."""
    await _ensure_loaded()
    return _cache_companies


async def get_all_symbols() -> list[str]:
    """Get all yfinance-compatible symbols (SYMBOL.NS)."""
    companies = await get_all_companies()
    return [c.yf_symbol for c in companies]


async def get_company_name(yf_symbol: str) -> str:
    """Resolve a yfinance symbol to its full company name."""
    await _ensure_loaded()
    return _name_lookup.get(yf_symbol, yf_symbol.split(".")[0])


async def get_name_lookup() -> dict[str, str]:
    """Get the full symbol -> name lookup dict."""
    await _ensure_loaded()
    return _name_lookup.copy()


async def search_companies(
    query: str, limit: int = 20
) -> list[NSECompany]:
    """Search NSE companies by name or symbol (case-insensitive)."""
    await _ensure_loaded()
    q = query.upper()
    results: list[NSECompany] = []
    for c in _cache_companies:
        if q in c.symbol.upper() or q in c.name.upper():
            results.append(c)
            if len(results) >= limit:
                break
    return results


async def get_company_count() -> int:
    """Get total number of NSE-listed companies."""
    await _ensure_loaded()
    return len(_cache_companies)


async def get_paginated_companies(
    page: int = 1,
    per_page: int = 50,
    search: str | None = None,
) -> tuple[list[NSECompany], int]:
    """
    Get a page of NSE companies with optional search filter.
    Returns (companies_for_page, total_matching).
    """
    await _ensure_loaded()

    filtered = _cache_companies
    if search:
        q = search.upper()
        filtered = [
            c
            for c in filtered
            if q in c.symbol.upper() or q in c.name.upper()
        ]

    total = len(filtered)
    start = (page - 1) * per_page
    end = start + per_page
    return filtered[start:end], total


def get_index_tickers() -> list[dict[str, str]]:
    """Get list of major Indian market index tickers for yfinance."""
    return INDIAN_INDICES.copy()


def is_loaded() -> bool:
    """Check if the NSE master list is currently loaded."""
    return bool(_cache_companies)


def get_loaded_count() -> int:
    """Get the number of companies currently in cache."""
    return len(_cache_companies)
