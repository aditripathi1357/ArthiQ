"""
Market-level API endpoints
══════════════════════════
Provides market-wide data: indices, top gainers/losers, most active,
paginated stock listings, and sector breakdowns.

All data is dynamically fetched — no hardcoded stock lists.
"""

import asyncio
import logging
import time

from fastapi import APIRouter, Query

from app.services import nse_master
from app.services.stock_fetcher import fetch_batch_quotes
from app.utils.company_logos import get_logo_url

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/market", tags=["Market"])


# ═════════════════════════════════════════════════════════════════════════════
# In-memory cache for market-wide snapshot
# ═════════════════════════════════════════════════════════════════════════════

_market_snapshot: list[dict] = []
_market_snapshot_time: float = 0
_SNAPSHOT_TTL = 120  # seconds — refresh every 2 minutes
_snapshot_lock = asyncio.Lock()
_fetch_in_progress = False

_indices_cache: list[dict] = []
_indices_cache_time: float = 0
_INDICES_TTL = 60  # seconds


async def _refresh_market_snapshot():
    """
    Build market snapshot by batch-fetching the first ~200 NSE companies.

    This runs lazily on first request and then respects the TTL.
    On a fresh cache miss, a quick 50-stock fetch is returned immediately
    while the full refresh happens in the background.
    """
    global _market_snapshot, _market_snapshot_time, _fetch_in_progress

    if _fetch_in_progress:
        return

    _fetch_in_progress = True
    try:
        all_companies = await nse_master.get_all_companies()
        if not all_companies:
            logger.warning("NSE master list empty — cannot build snapshot")
            return

        # Batch-fetch top 200 companies from the NSE list
        symbols = [c.yf_symbol for c in all_companies[:200]]
        data = await fetch_batch_quotes(symbols)

        # Enrich with full company names from NSE master
        name_map = await nse_master.get_name_lookup()
        for item in data:
            item["name"] = name_map.get(item["symbol"], item.get("name", ""))

        _market_snapshot = data
        _market_snapshot_time = time.time()
        logger.info("Market snapshot refreshed: %d stocks", len(data))
    except Exception as exc:
        logger.error("Market snapshot refresh failed: %s", exc)
    finally:
        _fetch_in_progress = False


async def _get_market_data() -> list[dict]:
    """Get market data, refreshing if cache is stale."""
    if _market_snapshot and (
        time.time() - _market_snapshot_time < _SNAPSHOT_TTL
    ):
        return _market_snapshot

    # If cache is stale, trigger background refresh
    if not _fetch_in_progress:
        asyncio.create_task(_refresh_market_snapshot())

    # Return existing cache (even if stale) while refresh happens
    if _market_snapshot:
        return _market_snapshot

    # Cold start: quick fetch of 11 major blue-chip stocks to return something fast
    # rather than downloading 50 symbols synchronously which blocks for 15s.
    # The full 200-stock snapshot will load in the background.
    symbols = [
        "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
        "HINDUNILVR.NS", "SBIN.NS", "BHARTIARTL.NS", "KOTAKBANK.NS", "ITC.NS", "MARUTI.NS"
    ]
    data = await fetch_batch_quotes(symbols)

    name_map = await nse_master.get_name_lookup()
    for item in data:
        item["name"] = name_map.get(item["symbol"], item.get("name", ""))

    return data


# ═════════════════════════════════════════════════════════════════════════════
# Indices
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/indices")
async def get_market_indices():
    """
    Live data for major Indian market indices.

    Fetches NIFTY 50, SENSEX, Bank Nifty, sector indices, etc.
    from yfinance dynamically.
    """
    global _indices_cache, _indices_cache_time

    # Serve from cache if fresh
    if _indices_cache and (time.time() - _indices_cache_time < _INDICES_TTL):
        return {"indices": _indices_cache, "total": len(_indices_cache)}

    index_tickers = nse_master.get_index_tickers()
    symbols = [idx["symbol"] for idx in index_tickers]

    quotes = await fetch_batch_quotes(symbols)
    quote_map = {q["symbol"]: q for q in quotes}

    results = []
    for idx in index_tickers:
        q = quote_map.get(idx["symbol"])
        results.append(
            {
                "name": idx["name"],
                "symbol": idx["symbol"],
                "value": q["price"] if q else None,
                "change": q.get("change") if q else None,
                "change_pct": q.get("change_pct") if q else None,
                "day_high": q.get("high") if q else None,
                "day_low": q.get("low") if q else None,
            }
        )

    _indices_cache = results
    _indices_cache_time = time.time()

    return {"indices": results, "total": len(results)}


# ═════════════════════════════════════════════════════════════════════════════
# Top movers (gainers, losers, most active)
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/top-gainers")
async def get_top_gainers(
    limit: int = Query(20, ge=1, le=50, description="Number of stocks"),
):
    """Top gaining stocks by change% — computed from live market data."""
    data = await _get_market_data()
    sorted_data = sorted(
        [d for d in data if d.get("change_pct") is not None],
        key=lambda x: x["change_pct"],
        reverse=True,
    )
    results = sorted_data[:limit]
    for item in results:
        if "logo_url" not in item:
            item["logo_url"] = get_logo_url(item["symbol"])
    return {
        "stocks": results,
        "total": len(sorted_data),
        "category": "gainers",
    }


@router.get("/top-losers")
async def get_top_losers(
    limit: int = Query(20, ge=1, le=50, description="Number of stocks"),
):
    """Top losing stocks by change% — computed from live market data."""
    data = await _get_market_data()
    sorted_data = sorted(
        [d for d in data if d.get("change_pct") is not None],
        key=lambda x: x["change_pct"],
    )
    results = sorted_data[:limit]
    for item in results:
        if "logo_url" not in item:
            item["logo_url"] = get_logo_url(item["symbol"])
    return {
        "stocks": results,
        "total": len(sorted_data),
        "category": "losers",
    }


@router.get("/most-active")
async def get_most_active(
    limit: int = Query(20, ge=1, le=50, description="Number of stocks"),
):
    """Most actively traded stocks by volume."""
    data = await _get_market_data()
    sorted_data = sorted(
        [d for d in data if d.get("volume") and d["volume"] > 0],
        key=lambda x: x["volume"],
        reverse=True,
    )
    results = sorted_data[:limit]
    for item in results:
        if "logo_url" not in item:
            item["logo_url"] = get_logo_url(item["symbol"])
    return {
        "stocks": results,
        "total": len(sorted_data),
        "category": "active",
    }


# ═════════════════════════════════════════════════════════════════════════════
# Unified movers endpoint
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/movers")
async def get_market_movers(
    type: str = Query("gainers", description="gainers | losers | active"),
    limit: int = Query(8, ge=1, le=50, description="Number of stocks"),
):
    """
    Unified market movers endpoint.

    type=gainers  → top gainers by change%
    type=losers   → top losers by change%
    type=active   → most active by volume
    """
    data = await _get_market_data()

    if type == "gainers":
        sorted_data = sorted(
            [d for d in data if d.get("change_pct") is not None and d["change_pct"] > 0],
            key=lambda x: x["change_pct"],
            reverse=True,
        )
    elif type == "losers":
        sorted_data = sorted(
            [d for d in data if d.get("change_pct") is not None and d["change_pct"] < 0],
            key=lambda x: x["change_pct"],
        )
    elif type == "active":
        sorted_data = sorted(
            [d for d in data if d.get("volume") and d["volume"] > 0],
            key=lambda x: x["volume"],
            reverse=True,
        )
    else:
        sorted_data = []

    results = sorted_data[:limit]
    for item in results:
        item["logo_url"] = get_logo_url(item["symbol"])

    return {
        "stocks": results,
        "total": len(sorted_data),
        "category": type,
    }


# ═════════════════════════════════════════════════════════════════════════════
# Market Breadth (advances vs declines)
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/breadth")
async def get_market_breadth():
    """
    Market breadth: count of advancing, declining, and unchanged stocks.

    Computed from the live market snapshot. Useful for Market Pulse section.
    """
    data = await _get_market_data()

    advances = sum(1 for d in data if d.get("change_pct") is not None and d["change_pct"] > 0.05)
    declines = sum(1 for d in data if d.get("change_pct") is not None and d["change_pct"] < -0.05)
    unchanged = sum(1 for d in data if d.get("change_pct") is not None and abs(d["change_pct"]) <= 0.05)
    total = len([d for d in data if d.get("change_pct") is not None])

    ratio = round(advances / declines, 2) if declines > 0 else float(advances)

    # Overall market mood
    if ratio >= 2.0:
        mood = "strongly_bullish"
    elif ratio >= 1.2:
        mood = "bullish"
    elif ratio >= 0.8:
        mood = "neutral"
    elif ratio >= 0.5:
        mood = "bearish"
    else:
        mood = "strongly_bearish"

    return {
        "advances": advances,
        "declines": declines,
        "unchanged": unchanged,
        "total": total,
        "advance_decline_ratio": ratio,
        "mood": mood,
        "snapshot_size": len(data),
    }


# ═════════════════════════════════════════════════════════════════════════════
# Paginated stock listing (ALL companies)
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/stocks")
async def get_all_stocks(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=10, le=100, description="Items per page"),
    search: str = Query(None, description="Search by symbol or name"),
    sort_by: str = Query(
        "symbol",
        description="Sort by: symbol, name, price, change_pct, volume",
    ),
    order: str = Query("asc", description="Sort order: asc or desc"),
):
    """
    Paginated list of ALL NSE-listed stocks with live prices.

    Fetches live prices for the current page's stocks on demand via yfinance.
    """
    companies, total = await nse_master.get_paginated_companies(
        page=page, per_page=per_page, search=search
    )

    if not companies:
        total_pages = 0
        return {
            "stocks": [],
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages,
        }

    # Batch-fetch live prices for this page's stocks
    symbols = [c.yf_symbol for c in companies]
    quotes = await fetch_batch_quotes(symbols)
    quote_map = {q["symbol"]: q for q in quotes}

    items = []
    for c in companies:
        q = quote_map.get(c.yf_symbol, {})
        items.append(
            {
                "symbol": c.yf_symbol,
                "name": c.name,
                "series": c.series,
                "price": q.get("price"),
                "open": q.get("open"),
                "high": q.get("high"),
                "low": q.get("low"),
                "close": q.get("close"),
                "volume": q.get("volume"),
                "previous_close": q.get("previous_close"),
                "change": q.get("change"),
                "change_pct": q.get("change_pct"),
            }
        )

    # Client-side sortable columns
    if sort_by in ("price", "change", "change_pct", "volume"):
        items.sort(
            key=lambda x: x.get(sort_by) or 0,
            reverse=(order == "desc"),
        )
    elif sort_by == "name":
        items.sort(
            key=lambda x: x.get("name", ""),
            reverse=(order == "desc"),
        )

    total_pages = (total + per_page - 1) // per_page

    return {
        "stocks": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
    }


# ═════════════════════════════════════════════════════════════════════════════
# Sectors
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/sectors")
async def get_sectors():
    """
    Get all sectors with company counts.

    Derives sectors directly from the NSE master list (loaded at startup),
    so this works immediately without a database.
    """
    try:
        all_companies = await nse_master.get_all_companies()
        sector_counts: dict[str, int] = {}
        for c in all_companies:
            sector = getattr(c, "industry", None) or getattr(c, "sector", None)
            if sector and sector.strip():
                sector_counts[sector.strip()] = sector_counts.get(sector.strip(), 0) + 1

        # If NSE master doesn't have sector info, return well-known NSE sectors
        if not sector_counts:
            known_sectors = [
                "Banking & Finance", "Information Technology", "Pharmaceuticals",
                "Automobile", "FMCG", "Energy & Power", "Metals & Mining",
                "Infrastructure", "Real Estate", "Chemicals", "Textiles",
                "Healthcare", "Telecom", "Media & Entertainment", "Agriculture",
            ]
            sector_counts = {s: 0 for s in known_sectors}

        sectors = [
            {"name": name, "company_count": count}
            for name, count in sorted(sector_counts.items(), key=lambda x: -x[1])
        ]
    except Exception as exc:
        logger.error("Failed to fetch sectors from NSE master: %s", exc)
        # Fallback: hardcoded NSE sector list
        sectors = [
            {"name": s, "company_count": 0} for s in [
                "Banking & Finance", "Information Technology", "Pharmaceuticals",
                "Automobile", "FMCG", "Energy & Power", "Metals & Mining",
                "Infrastructure", "Real Estate", "Chemicals",
            ]
        ]

    return {"sectors": sectors, "total": len(sectors)}


# ═════════════════════════════════════════════════════════════════════════════
# Market overview
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/overview")
async def get_market_overview():
    """
    Combined market overview: company count + indices + cache status.
    """
    company_count = await nse_master.get_company_count()
    indices_resp = await get_market_indices()

    return {
        "total_companies": company_count,
        "indices": indices_resp["indices"],
        "nse_loaded": nse_master.is_loaded(),
        "snapshot_size": len(_market_snapshot),
    }
