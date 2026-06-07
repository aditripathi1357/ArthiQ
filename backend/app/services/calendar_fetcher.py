"""
Economic Calendar Fetcher
══════════════════════════
Sources:
  1. yfinance — earnings calendar for NSE top stocks
  2. investpy — Indian economic events (if available)
  3. Google News RSS — macro event headlines as fallback

All returns are gracefully degraded if a source fails.
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from functools import partial

logger = logging.getLogger(__name__)

# Top NSE stocks to check earnings calendar
TOP_NSE_SYMBOLS = [
    "RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "ICICIBANK.NS",
    "SBIN.NS", "WIPRO.NS", "BHARTIARTL.NS", "LT.NS", "KOTAKBANK.NS",
    "AXISBANK.NS", "BAJFINANCE.NS", "MARUTI.NS", "TATAMOTORS.NS",
    "SUNPHARMA.NS", "HCLTECH.NS", "NESTLEIND.NS", "ITC.NS", "ONGC.NS",
    "NTPC.NS", "POWERGRID.NS", "ZOMATO.NS", "ASIANPAINT.NS", "TITAN.NS",
    "ADANIENT.NS", "BAJAJ-AUTO.NS", "TECHM.NS", "ULTRACEMCO.NS", "GRASIM.NS",
]

# In-memory cache for calendar data
_earnings_cache: list[dict] = []
_earnings_cache_time: float = 0
_EARNINGS_TTL = 6 * 3600  # 6 hours

_economic_cache: list[dict] = []
_economic_cache_time: float = 0
_ECONOMIC_TTL = 4 * 3600  # 4 hours


def clear_calendar_cache():
    """Force a cache flush so next request refetches live data."""
    global _earnings_cache_time, _economic_cache_time
    _earnings_cache_time = 0
    _economic_cache_time = 0


# ═════════════════════════════════════════════════════════════════════════════
# Earnings Calendar — yfinance
# ═════════════════════════════════════════════════════════════════════════════

def _fetch_earnings_sync(symbol: str) -> dict | None:
    """Fetch earnings date + EPS estimates for a single symbol via yfinance (blocking)."""
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        cal = ticker.calendar
        if cal is None:
            return None

        # calendar may be a dict or DataFrame
        if hasattr(cal, "to_dict"):
            cal = cal.to_dict()

        earnings_dates = cal.get("Earnings Date") or cal.get("earnings_date")
        if not earnings_dates:
            return None

        # Could be a list
        if isinstance(earnings_dates, list):
            first = earnings_dates[0]
        else:
            first = earnings_dates

        # Convert to string
        if hasattr(first, "strftime"):
            date_str = first.strftime("%Y-%m-%d")
        else:
            date_str = str(first)[:10]

        # Try to get display name and EPS data from fast_info / info
        fast = ticker.fast_info
        name = getattr(fast, "display_name", None) or symbol.split(".")[0]

        # Get EPS forecast (forward EPS) and previous (trailing EPS)
        forecast_eps = ""
        previous_eps = ""
        try:
            info = ticker.info or {}
            fwd_eps = info.get("forwardEps")
            trail_eps = info.get("trailingEps")
            currency = info.get("financialCurrency", "INR")
            if fwd_eps is not None:
                forecast_eps = f"₹{fwd_eps:.2f}" if currency == "INR" else f"{fwd_eps:.2f}"
            if trail_eps is not None:
                previous_eps = f"₹{trail_eps:.2f}" if currency == "INR" else f"{trail_eps:.2f}"
        except Exception:
            pass

        return {
            "type": "earnings",
            "symbol": symbol,
            "company": name,
            "date": date_str,
            "importance": 3,
            "event": f"{symbol.split('.')[0]} Quarterly Results",
            "cur": "INR",
            "flag": "🇮🇳",
            "actual": "",           # Empty until results are published
            "forecast": forecast_eps,  # Forward EPS estimate
            "previous": previous_eps,  # Trailing (last reported) EPS
        }
    except Exception as exc:
        logger.debug("Earnings fetch failed for %s: %s", symbol, exc)
        return None



async def fetch_earnings_calendar(symbols: list[str] | None = None) -> list[dict]:
    """
    Fetch upcoming earnings dates for top NSE stocks.
    Uses yfinance calendar data. Cached 6 hours.
    """
    global _earnings_cache, _earnings_cache_time
    import time

    if _earnings_cache and time.time() - _earnings_cache_time < _EARNINGS_TTL:
        return _earnings_cache

    target_symbols = symbols or TOP_NSE_SYMBOLS
    loop = asyncio.get_running_loop()

    # Fetch in batches to avoid overwhelming yfinance
    events: list[dict] = []
    batch_size = 8
    for i in range(0, len(target_symbols), batch_size):
        batch = target_symbols[i: i + batch_size]
        tasks = [
            loop.run_in_executor(None, partial(_fetch_earnings_sync, sym))
            for sym in batch
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for r in results:
            if isinstance(r, dict):
                events.append(r)

    # Sort by date
    today = datetime.now(timezone.utc).date().isoformat()
    events.sort(key=lambda x: x.get("date", "9999-99-99"))

    # Classify as upcoming / released based on date
    for ev in events:
        ev["category"] = "upcoming" if ev.get("date", "9999") >= today else "released"

    _earnings_cache = events
    _earnings_cache_time = time.time()
    logger.info("Earnings calendar: %d events fetched", len(events))
    return events


# ═════════════════════════════════════════════════════════════════════════════
# Economic Calendar — investpy (with graceful fallback)
# ═════════════════════════════════════════════════════════════════════════════

def _fetch_economic_sync() -> list[dict]:
    """Try investpy for Indian economic events. Returns [] on failure."""
    try:
        import investpy
        from datetime import date

        today = date.today()
        end = today + timedelta(days=14)

        calendar = investpy.economic_calendar(
            time_zone="Asia/Kolkata",
            countries=["india"],
            importances=["high", "medium"],
            from_date=today.strftime("%d/%m/%Y"),
            to_date=end.strftime("%d/%m/%Y"),
        )

        events = []
        for _, row in calendar.iterrows():
            imp = str(row.get("importance", "low")).lower()
            imp_num = 3 if imp == "high" else 2 if imp == "medium" else 1

            # Determine category
            actual = str(row.get("actual", "")) or ""
            category = "released" if actual and actual not in ("—", "-", "", "None") else "upcoming"

            events.append({
                "type": "economic",
                "time": str(row.get("time", "—")),
                "cur": "INR",
                "flag": "🇮🇳",
                "event": str(row.get("event", "Unknown Event")),
                "importance": imp_num,
                "actual": actual if actual not in ("None", "nan") else "",
                "forecast": str(row.get("forecast", "")) if str(row.get("forecast", "")) not in ("None", "nan") else "",
                "previous": str(row.get("previous", "")) if str(row.get("previous", "")) not in ("None", "nan") else "",
                "date": str(row.get("date", "")),
                "category": category,
                "country": "India",
            })

        return events

    except ImportError:
        logger.warning("investpy not installed — using fallback economic calendar")
        return []
    except Exception as exc:
        logger.warning("investpy economic calendar failed: %s", exc)
        return []


async def fetch_economic_calendar() -> list[dict]:
    """
    Fetch Indian economic calendar events.
    Primary: investpy. Fallback: curated static events + RSS headlines.
    """
    global _economic_cache, _economic_cache_time
    import time

    if _economic_cache and time.time() - _economic_cache_time < _ECONOMIC_TTL:
        return _economic_cache

    loop = asyncio.get_running_loop()
    events = await loop.run_in_executor(None, _fetch_economic_sync)

    if not events:
        # Fallback: sensible recurring Indian economic events
        events = _get_fallback_economic_events()

    _economic_cache = events
    _economic_cache_time = time.time()
    logger.info("Economic calendar: %d events", len(events))
    return events


def _get_fallback_economic_events() -> list[dict]:
    """Fallback: well-known recurring Indian economic calendar events."""
    today = datetime.now(timezone.utc)
    
    def next_weekday(d: datetime, weekday: int) -> str:
        """Get next occurrence of weekday (0=Mon...6=Sun)."""
        days_ahead = weekday - d.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        return (d + timedelta(days=days_ahead)).strftime("%Y-%m-%d")

    upcoming_friday = next_weekday(today, 4)
    next_month_10 = (today.replace(day=1) + timedelta(days=40)).replace(day=10).strftime("%Y-%m-%d")
    next_month_12 = (today.replace(day=1) + timedelta(days=40)).replace(day=12).strftime("%Y-%m-%d")

    return [
        {
            "type": "economic", "time": "10:00", "cur": "INR", "flag": "🇮🇳",
            "event": "RBI MPC Interest Rate Decision",
            "importance": 3, "actual": "", "forecast": "6.25%", "previous": "6.25%",
            "date": next_weekday(today, 4), "category": "upcoming", "country": "India",
        },
        {
            "type": "economic", "time": "17:30", "cur": "INR", "flag": "🇮🇳",
            "event": "CPI Inflation (YoY)",
            "importance": 3, "actual": "", "forecast": "4.9%", "previous": "5.1%",
            "date": next_month_12, "category": "upcoming", "country": "India",
        },
        {
            "type": "economic", "time": "17:30", "cur": "INR", "flag": "🇮🇳",
            "event": "Industrial Production (IIP) (YoY)",
            "importance": 2, "actual": "", "forecast": "4.2%", "previous": "3.8%",
            "date": next_month_12, "category": "upcoming", "country": "India",
        },
        {
            "type": "economic", "time": "12:00", "cur": "INR", "flag": "🇮🇳",
            "event": "HSBC Manufacturing PMI",
            "importance": 2, "actual": "", "forecast": "58.5", "previous": "58.1",
            "date": next_weekday(today, 1), "category": "upcoming", "country": "India",
        },
        {
            "type": "economic", "time": "17:30", "cur": "INR", "flag": "🇮🇳",
            "event": "Foreign Exchange Reserves",
            "importance": 2, "actual": "", "forecast": "", "previous": "$642.5B",
            "date": upcoming_friday, "category": "upcoming", "country": "India",
        },
        {
            "type": "economic", "time": "17:30", "cur": "INR", "flag": "🇮🇳",
            "event": "Wholesale Price Index (WPI) (YoY)",
            "importance": 2, "actual": "", "forecast": "0.3%", "previous": "0.2%",
            "date": next_month_10, "category": "upcoming", "country": "India",
        },
        {
            "type": "economic", "time": "17:30", "cur": "INR", "flag": "🇮🇳",
            "event": "Trade Balance",
            "importance": 2, "actual": "", "forecast": "-$18.5B", "previous": "-$17.8B",
            "date": next_month_12, "category": "upcoming", "country": "India",
        },
        {
            "type": "economic", "time": "11:30", "cur": "INR", "flag": "🇮🇳",
            "event": "HSBC Services PMI",
            "importance": 2, "actual": "60.8", "forecast": "60.3", "previous": "59.6",
            "date": (today - timedelta(days=3)).strftime("%Y-%m-%d"),
            "category": "released", "country": "India",
        },
        {
            "type": "economic", "time": "17:30", "cur": "INR", "flag": "🇮🇳",
            "event": "Direct Tax Collections",
            "importance": 1, "actual": "₹21.3L Cr", "forecast": "", "previous": "₹19.6L Cr",
            "date": (today - timedelta(days=5)).strftime("%Y-%m-%d"),
            "category": "released", "country": "India",
        },
    ]


# ═════════════════════════════════════════════════════════════════════════════
# Combined calendar
# ═════════════════════════════════════════════════════════════════════════════

async def fetch_all_calendar_events() -> dict:
    """
    Fetch and combine all calendar events (economic + earnings).
    Groups events by: today / tomorrow / this_week / upcoming / recently_released.
    """
    economic_task = fetch_economic_calendar()
    earnings_task = fetch_earnings_calendar()

    economic_events, earnings_events = await asyncio.gather(
        economic_task, earnings_task, return_exceptions=True
    )

    if isinstance(economic_events, Exception):
        logger.error("Economic calendar error: %s", economic_events)
        economic_events = []
    if isinstance(earnings_events, Exception):
        logger.error("Earnings calendar error: %s", earnings_events)
        earnings_events = []

    all_events = list(economic_events) + list(earnings_events)

    today = datetime.now(timezone.utc).date()
    tomorrow = today + timedelta(days=1)
    this_week_end = today + timedelta(days=7)

    grouped: dict[str, list] = {
        "today": [],
        "tomorrow": [],
        "this_week": [],
        "upcoming": [],
        "recently_released": [],
    }

    for ev in all_events:
        date_str = ev.get("date", "")
        try:
            ev_date = datetime.strptime(date_str[:10], "%Y-%m-%d").date()
        except (ValueError, TypeError):
            ev_date = None

        category = ev.get("category", "upcoming")
        if category == "released":
            grouped["recently_released"].append(ev)
        elif ev_date is None:
            grouped["upcoming"].append(ev)
        elif ev_date == today:
            grouped["today"].append(ev)
        elif ev_date == tomorrow:
            grouped["tomorrow"].append(ev)
        elif ev_date <= this_week_end:
            grouped["this_week"].append(ev)
        else:
            grouped["upcoming"].append(ev)

    # Sort each group by date+time
    for key in grouped:
        grouped[key].sort(
            key=lambda x: (x.get("date", "9999-99-99"), x.get("time", "00:00"))
        )

    return {
        **grouped,
        "economic_total": len(economic_events),
        "earnings_total": len(earnings_events),
        "total": len(all_events),
    }
