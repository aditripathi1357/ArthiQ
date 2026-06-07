"""
Stocks router -- live quotes, historical OHLCV, and chart data.

Calls the stock_fetcher service directly so endpoints work
even with an empty database.
"""

import logging
import math

from fastapi import APIRouter, HTTPException, Query

from app.schemas.stock import (
    StockQuote,
    StockHistoryResponse,
    OHLCVBar,
    StockChartResponse,
    ChartPoint,
)
from app.services.stock_fetcher import fetch_stock_quote, fetch_stock_history
from app.utils.cache import get_cached, set_cached

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stocks", tags=["Stocks"])

# Valid period / interval combos for yfinance
VALID_PERIODS = {"1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "max"}
VALID_INTERVALS = {"1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h", "1d", "5d", "1wk", "1mo", "3mo"}


def _clean_float(v: float) -> float:
    """Replace NaN / Inf with 0.0 for JSON safety."""
    if v is None or math.isnan(v) or math.isinf(v):
        return 0.0
    return round(v, 4)


# ═════════════════════════════════════════════════════════════════════════════
# GET /api/stocks/{symbol}/quote
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/{symbol}/quote", response_model=StockQuote)
async def get_stock_quote(symbol: str):
    """
    Get the current live price quote for a symbol.

    Returns open, high, low, close, volume and calculated change%.
    Data is fetched live from yfinance on every request.
    """
    cached = get_cached(("quote", symbol.upper()), 15)
    if cached is not None:
        return StockQuote(**cached)

    quote = await fetch_stock_quote(symbol)
    if not quote:
        raise HTTPException(
            status_code=404,
            detail=f"Could not fetch quote for '{symbol}'. Verify the symbol is valid (e.g. RELIANCE.NS).",
        )

    close = _clean_float(quote["close"])
    open_price = _clean_float(quote["open"])

    # Calculate change from open
    change = round(close - open_price, 2) if open_price else None
    change_pct = round((change / open_price) * 100, 2) if open_price and change is not None else None

    res_quote = StockQuote(
        symbol=symbol,
        timestamp=quote["timestamp"],
        open=open_price,
        high=_clean_float(quote["high"]),
        low=_clean_float(quote["low"]),
        close=close,
        volume=_clean_float(quote["volume"]),
        previous_close=None,  # not available from quote snapshot
        change=change,
        change_pct=change_pct,
        price=close,
        market_cap=quote.get("market_cap"),
        pe_ratio=quote.get("pe_ratio"),
        week_52_low=quote.get("week_52_low"),
        week_52_high=quote.get("week_52_high"),
    )

    set_cached(("quote", symbol.upper()), res_quote.model_dump(mode='json'))
    return res_quote


# ═════════════════════════════════════════════════════════════════════════════
# GET /api/stocks/{symbol}/history?period=1mo&interval=1d
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/{symbol}/history", response_model=StockHistoryResponse)
async def get_stock_history(
    symbol: str,
    period: str = Query("1mo", description="1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, max"),
    interval: str = Query("1d", description="1m, 5m, 15m, 1h, 1d, 1wk, 1mo"),
):
    """
    Get historical OHLCV data for a symbol.

    Fetched live from yfinance. Supports all standard period/interval combinations.
    """
    if period not in VALID_PERIODS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid period '{period}'. Valid: {', '.join(sorted(VALID_PERIODS))}",
        )
    if interval not in VALID_INTERVALS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid interval '{interval}'. Valid: {', '.join(sorted(VALID_INTERVALS))}",
        )

    cache_key = ("history", symbol.upper(), period, interval)
    cached = get_cached(cache_key, 300)
    if cached is not None:
        return StockHistoryResponse(
            symbol=symbol,
            period=period,
            interval=interval,
            total=len(cached),
            bars=[OHLCVBar(**b) for b in cached],
        )

    records = await fetch_stock_history(symbol, period=period, interval=interval)
    if not records:
        raise HTTPException(
            status_code=404,
            detail=f"No history data for '{symbol}' with period={period}, interval={interval}.",
        )

    bars = [
        OHLCVBar(
            timestamp=r["timestamp"],
            open=_clean_float(r["open"]),
            high=_clean_float(r["high"]),
            low=_clean_float(r["low"]),
            close=_clean_float(r["close"]),
            volume=_clean_float(r["volume"]),
        )
        for r in records
    ]

    res_history = StockHistoryResponse(
        symbol=symbol,
        period=period,
        interval=interval,
        total=len(bars),
        bars=bars,
    )

    set_cached(cache_key, [b.model_dump(mode='json') for b in bars])
    return res_history


# ═════════════════════════════════════════════════════════════════════════════
# GET /api/stocks/{symbol}/chart?period=1mo
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/{symbol}/chart", response_model=StockChartResponse)
async def get_stock_chart(
    symbol: str,
    period: str = Query("1mo", description="1d, 5d, 1mo, 3mo, 6mo, 1y"),
):
    """
    Get simplified price data optimized for frontend charting.

    Returns compact {t, p, v} objects for minimal payload size.
    """
    if period not in VALID_PERIODS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid period '{period}'. Valid: {', '.join(sorted(VALID_PERIODS))}",
        )

    cache_key = ("chart", symbol.upper(), period)
    cached = get_cached(cache_key, 300)
    if cached is not None:
        return StockChartResponse(
            symbol=symbol,
            period=period,
            total=len(cached),
            data=[ChartPoint(**p) for p in cached],
        )

    # Choose interval based on period for sensible chart density
    interval_map = {
        "1d": "5m",
        "5d": "15m",
        "1mo": "1d",
        "3mo": "1d",
        "6mo": "1d",
        "1y": "1wk",
        "2y": "1wk",
        "5y": "1mo",
        "max": "1mo",
    }
    interval = interval_map.get(period, "1d")

    records = await fetch_stock_history(symbol, period=period, interval=interval)
    if not records:
        raise HTTPException(
            status_code=404,
            detail=f"No chart data for '{symbol}'.",
        )

    data = [
        ChartPoint(
            t=r["timestamp"],
            p=_clean_float(r["close"]),
            v=_clean_float(r["volume"]),
        )
        for r in records
    ]

    res_chart = StockChartResponse(
        symbol=symbol,
        period=period,
        total=len(data),
        data=data,
    )

    set_cached(cache_key, [p.model_dump(mode='json') for p in data])
    return res_chart
