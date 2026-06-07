"""
Stock data fetcher — pulls OHLCV data and company info from yfinance.

All functions are async-compatible and can persist results directly to PostgreSQL.
Callable from both API routers and APScheduler background jobs.
"""

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from functools import partial

import yfinance as yf
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import async_session_factory
from app.models.company import Company
from app.models.stock_price import StockPrice

logger = logging.getLogger(__name__)
settings = get_settings()

# ── Hardcoded watchlist of Indian stocks for scheduler ───────────────────────
TRACKED_SYMBOLS: list[str] = [
    "RELIANCE.NS",
    "TCS.NS",
    "INFY.NS",
    "HDFCBANK.NS",
    "MARUTI.NS",
    "ICICIBANK.NS",
]


# ═════════════════════════════════════════════════════════════════════════════
# INTERNAL HELPERS — run blocking yfinance calls off the event loop
# ═════════════════════════════════════════════════════════════════════════════

def _sync_fetch_quote(symbol: str) -> dict | None:
    """Blocking call — fetch current quote snapshot from yfinance."""
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        if not info or "regularMarketPrice" not in info:
            # Fallback: grab the last row from 1-day history
            hist = ticker.history(period="1d", interval="1m")
            if hist.empty:
                return None
            last = hist.iloc[-1]
            return {
                "timestamp": hist.index[-1].to_pydatetime().replace(tzinfo=timezone.utc),
                "open": float(last["Open"]),
                "high": float(last["High"]),
                "low": float(last["Low"]),
                "close": float(last["Close"]),
                "volume": float(last["Volume"]),
                "market_cap": None,
                "pe_ratio": None,
                "week_52_low": None,
                "week_52_high": None,
            }

        return {
            "timestamp": datetime.now(timezone.utc),
            "open": float(info.get("regularMarketOpen", 0)),
            "high": float(info.get("regularMarketDayHigh", 0)),
            "low": float(info.get("regularMarketDayLow", 0)),
            "close": float(info.get("regularMarketPrice", 0)),
            "volume": float(info.get("regularMarketVolume", 0)),
            "market_cap": info.get("marketCap"),
            "pe_ratio": info.get("trailingPE") or info.get("forwardPE"),
            "week_52_low": info.get("fiftyTwoWeekLow"),
            "week_52_high": info.get("fiftyTwoWeekHigh"),
        }
    except Exception as exc:
        logger.error("_sync_fetch_quote(%s) failed: %s", symbol, exc)
        return None


def _sync_fetch_history(symbol: str, period: str, interval: str) -> list[dict]:
    """Blocking call — fetch historical OHLCV bars from yfinance."""
    try:
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=period, interval=interval)
        if df.empty:
            logger.warning("No history returned for %s (period=%s)", symbol, period)
            return []

        records: list[dict] = []
        for ts, row in df.iterrows():
            records.append({
                "timestamp": ts.to_pydatetime().replace(tzinfo=timezone.utc),
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                "volume": float(row["Volume"]),
            })
        return records
    except Exception as exc:
        logger.error("_sync_fetch_history(%s) failed: %s", symbol, exc)
        return []


def _sync_fetch_company_info(symbol: str) -> dict | None:
    """Blocking call — fetch company profile metadata from yfinance."""
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        if not info or "shortName" not in info:
            return None

        # Determine exchange label
        exchange_map = {
            "NSI": "NSE", "NSE": "NSE",
            "BOM": "BSE", "BSE": "BSE",
            "NYQ": "NYSE", "NMS": "NASDAQ",
        }
        raw_exchange = info.get("exchange", "")
        exchange = exchange_map.get(raw_exchange, raw_exchange)

        return {
            "symbol": symbol,
            "name": info.get("shortName", info.get("longName", symbol)),
            "exchange": exchange,
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "description": info.get("longBusinessSummary"),
            "ceo": None,  # yfinance doesn't reliably provide CEO
            "website": info.get("website"),
            "headquarters": _build_hq(info),
            "founded_year": None,
        }
    except Exception as exc:
        logger.error("_sync_fetch_company_info(%s) failed: %s", symbol, exc)
        return None


def _build_hq(info: dict) -> str | None:
    """Build headquarters string from yfinance info dict."""
    city = info.get("city", "")
    state = info.get("state", "")
    country = info.get("country", "")
    parts = [p for p in (city, state, country) if p]
    return ", ".join(parts) if parts else None


# ═════════════════════════════════════════════════════════════════════════════
# PUBLIC ASYNC API — callable from routers and scheduler
# ═════════════════════════════════════════════════════════════════════════════

async def fetch_stock_quote(symbol: str) -> dict | None:
    """
    Fetch the current price snapshot for a symbol.

    Returns:
        Dict with timestamp, open, high, low, close, volume — or None on failure.
    """
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, partial(_sync_fetch_quote, symbol))
    if result:
        logger.info("Quote for %s: close=%.2f volume=%.0f", symbol, result["close"], result["volume"])
    else:
        logger.warning("No quote data returned for %s", symbol)
    return result


async def fetch_stock_history(
    symbol: str,
    period: str = "1mo",
    interval: str = "1d",
) -> list[dict]:
    """
    Fetch historical OHLCV bars for a symbol.

    Args:
        symbol:   Ticker (e.g. "RELIANCE.NS").
        period:   "1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "max".
        interval: "1m", "5m", "15m", "1h", "1d", "1wk", "1mo".

    Returns:
        List of dicts with timestamp, open, high, low, close, volume.
    """
    from app.utils.cache import get_cached, set_cached
    cache_key = ("history", symbol.upper(), period, interval)
    cached = get_cached(cache_key, 300)
    if cached is not None:
        return cached

    loop = asyncio.get_running_loop()
    records = await loop.run_in_executor(
        None, partial(_sync_fetch_history, symbol, period, interval)
    )
    logger.info("History for %s: %d bars (period=%s, interval=%s)", symbol, len(records), period, interval)
    if records:
        set_cached(cache_key, records)
    return records


async def fetch_company_info(symbol: str) -> dict | None:
    """
    Fetch company profile metadata (name, sector, CEO, website, …).

    Returns:
        Dict with company fields — or None on failure.
    """
    loop = asyncio.get_running_loop()
    info = await loop.run_in_executor(None, partial(_sync_fetch_company_info, symbol))
    if info:
        logger.info("Company info for %s: %s (%s)", symbol, info["name"], info["exchange"])
    return info


# ═════════════════════════════════════════════════════════════════════════════
# PERSISTENCE — store fetched data into PostgreSQL
# ═════════════════════════════════════════════════════════════════════════════

async def _get_or_create_company(session: AsyncSession, symbol: str) -> Company:
    """Look up a company by symbol, or auto-create it from yfinance."""
    result = await session.execute(
        select(Company).where(Company.symbol == symbol)
    )
    company = result.scalar_one_or_none()

    if company:
        return company

    # Auto-create from yfinance metadata
    info = await fetch_company_info(symbol)
    company = Company(
        symbol=symbol,
        name=info["name"] if info else symbol,
        exchange=info.get("exchange", "UNKNOWN") if info else "UNKNOWN",
        sector=info.get("sector") if info else None,
        industry=info.get("industry") if info else None,
        description=info.get("description") if info else None,
        ceo=info.get("ceo") if info else None,
        website=info.get("website") if info else None,
        headquarters=info.get("headquarters") if info else None,
        founded_year=info.get("founded_year") if info else None,
    )
    session.add(company)
    await session.flush()
    logger.info("Auto-created company record for %s (id=%s)", symbol, company.id)
    return company


async def persist_stock_quote(symbol: str, session: AsyncSession | None = None) -> StockPrice | None:
    """
    Fetch the current quote and persist it to the stock_prices table.

    If no session is provided, creates its own (for scheduler use).
    Returns the created StockPrice row, or None on failure.
    """
    quote = await fetch_stock_quote(symbol)
    if not quote:
        return None

    own_session = session is None
    if own_session:
        session = async_session_factory()

    try:
        company = await _get_or_create_company(session, symbol)

        price = StockPrice(
            company_id=company.id,
            timestamp=quote["timestamp"],
            open=quote["open"],
            high=quote["high"],
            low=quote["low"],
            close=quote["close"],
            volume=quote["volume"],
            is_live=True,
        )
        session.add(price)

        if own_session:
            await session.commit()
            await session.refresh(price)

        logger.info("Persisted quote for %s: close=%.2f", symbol, quote["close"])
        return price

    except Exception as exc:
        logger.error("Failed to persist quote for %s: %s", symbol, exc)
        if own_session:
            await session.rollback()
        return None
    finally:
        if own_session:
            await session.close()


async def persist_stock_history(
    symbol: str,
    period: str = "1mo",
    interval: str = "1d",
    session: AsyncSession | None = None,
) -> int:
    """
    Fetch historical data and bulk-insert into stock_prices.

    Returns the number of rows inserted.
    """
    records = await fetch_stock_history(symbol, period, interval)
    if not records:
        return 0

    own_session = session is None
    if own_session:
        session = async_session_factory()

    try:
        company = await _get_or_create_company(session, symbol)

        rows: list[StockPrice] = []
        for rec in records:
            rows.append(StockPrice(
                company_id=company.id,
                timestamp=rec["timestamp"],
                open=rec["open"],
                high=rec["high"],
                low=rec["low"],
                close=rec["close"],
                volume=rec["volume"],
                is_live=False,
            ))
        session.add_all(rows)

        if own_session:
            await session.commit()

        logger.info("Persisted %d history bars for %s", len(rows), symbol)
        return len(rows)

    except Exception as exc:
        logger.error("Failed to persist history for %s: %s", symbol, exc)
        if own_session:
            await session.rollback()
        return 0
    finally:
        if own_session:
            await session.close()


async def persist_company_info(symbol: str, session: AsyncSession | None = None) -> Company | None:
    """
    Fetch company info and upsert into the companies table.

    Returns the Company row, or None on failure.
    """
    info = await fetch_company_info(symbol)
    if not info:
        return None

    own_session = session is None
    if own_session:
        session = async_session_factory()

    try:
        result = await session.execute(
            select(Company).where(Company.symbol == symbol)
        )
        company = result.scalar_one_or_none()

        if company:
            # Update existing fields
            for field in ("name", "exchange", "sector", "industry", "description",
                          "ceo", "website", "headquarters", "founded_year"):
                value = info.get(field)
                if value is not None:
                    setattr(company, field, value)
            logger.info("Updated company info for %s", symbol)
        else:
            company = Company(**info)
            session.add(company)
            logger.info("Created company record for %s", symbol)

        if own_session:
            await session.commit()
            await session.refresh(company)

        return company

    except Exception as exc:
        logger.error("Failed to persist company info for %s: %s", symbol, exc)
        if own_session:
            await session.rollback()
        return None
    finally:
        if own_session:
            await session.close()


# ═════════════════════════════════════════════════════════════════════════════
# Batch quote fetching (for market-wide endpoints)
# ═════════════════════════════════════════════════════════════════════════════

def _batch_download_sync(symbols: list[str]) -> list[dict]:
    """
    Blocking batch download using yf.download().

    Fetches 5 days of daily data so we always have at least
    2 trading days to compute change/change%.
    """
    import pandas as pd  # noqa: available via yfinance dependency

    if not symbols:
        return []

    try:
        df = yf.download(
            symbols if len(symbols) > 1 else symbols[0],
            period="5d",
            interval="1d",
            progress=False,
            threads=True if len(symbols) > 1 else False,
        )
    except Exception as exc:
        logger.error("yf.download batch failed: %s", exc)
        return []

    if df is None or df.empty:
        return []

    results: list[dict] = []
    is_multi = isinstance(df.columns, pd.MultiIndex)

    for sym in symbols:
        try:
            if is_multi:
                close = df[("Close", sym)].dropna()
                open_ = df[("Open", sym)].dropna()
                high = df[("High", sym)].dropna()
                low = df[("Low", sym)].dropna()
                volume = df[("Volume", sym)].dropna()
            else:
                # Single ticker — flat columns
                close = df["Close"].dropna()
                open_ = df["Open"].dropna()
                high = df["High"].dropna()
                low = df["Low"].dropna()
                volume = df["Volume"].dropna()

            if close.empty:
                continue

            current_price = float(close.iloc[-1])
            prev_close = float(close.iloc[-2]) if len(close) > 1 else None

            change = None
            change_pct = None
            if prev_close and prev_close != 0:
                change = round(current_price - prev_close, 2)
                change_pct = round((change / prev_close) * 100, 2)

            results.append(
                {
                    "symbol": sym,
                    "name": sym.split(".")[0],
                    "price": round(current_price, 2),
                    "open": round(float(open_.iloc[-1]), 2)
                    if not open_.empty
                    else None,
                    "high": round(float(high.iloc[-1]), 2)
                    if not high.empty
                    else None,
                    "low": round(float(low.iloc[-1]), 2)
                    if not low.empty
                    else None,
                    "close": round(current_price, 2),
                    "volume": int(volume.iloc[-1])
                    if not volume.empty
                    else 0,
                    "previous_close": round(prev_close, 2)
                    if prev_close
                    else None,
                    "change": change,
                    "change_pct": change_pct,
                }
            )
        except Exception as exc:
            logger.debug("Batch parse error for %s: %s", sym, exc)
            continue

    return results


async def fetch_batch_quotes(symbols: list[str]) -> list[dict]:
    """
    Async batch-fetch current quotes for multiple symbols.

    Uses yf.download() under the hood for efficient multi-ticker retrieval.
    Runs the blocking yfinance call in a thread pool executor.
    """
    if not symbols:
        return []

    from app.utils.cache import get_cached, set_cached

    cached_results = []
    missing_symbols = []

    for sym in symbols:
        cached = get_cached(("quote", sym.upper()), 120)
        if cached is not None:
            cached_results.append(cached)
        else:
            missing_symbols.append(sym)

    if not missing_symbols:
        return cached_results

    loop = asyncio.get_event_loop()

    # Fetch from yfinance only for missing symbols
    fetched_results = []
    if len(missing_symbols) <= 50:
        fetched_results = await loop.run_in_executor(None, _batch_download_sync, missing_symbols)
    else:
        batch_size = 50
        for i in range(0, len(missing_symbols), batch_size):
            batch = missing_symbols[i : i + batch_size]
            batch_results = await loop.run_in_executor(None, _batch_download_sync, batch)
            fetched_results.extend(batch_results)

    # Cache the newly fetched results
    for item in fetched_results:
        set_cached(("quote", item["symbol"].upper()), item)

    # Combine cached and newly fetched results, keeping the original order of symbols
    results_map = {item["symbol"]: item for item in (cached_results + fetched_results)}
    final_results = []
    for sym in symbols:
        if sym in results_map:
            final_results.append(results_map[sym])

    return final_results


async def resolve_stock_symbol(symbol: str) -> str:
    """
    Validate and normalize a stock symbol.
    If the symbol is valid as-is, return it (uppercase).
    If not, and it does not contain a '.', try appending '.NS' and verify if that works.
    Otherwise, return the original symbol + '.NS' as default fallback.
    """
    symbol = symbol.strip().upper()
    
    if "." in symbol:
        return symbol

    # Try fetching quote for symbol as-is
    quotes = await fetch_batch_quotes([symbol])
    if quotes and (quotes[0].get("price") or quotes[0].get("close")) is not None:
        return symbol

    # Otherwise, try appending .NS
    ns_symbol = f"{symbol}.NS"
    quotes_ns = await fetch_batch_quotes([ns_symbol])
    if quotes_ns and (quotes_ns[0].get("price") or quotes_ns[0].get("close")) is not None:
        return ns_symbol

    return ns_symbol


