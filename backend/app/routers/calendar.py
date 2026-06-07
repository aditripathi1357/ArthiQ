"""
Calendar API Router
════════════════════
Endpoints:
  GET /api/calendar/economic   — Indian economic events
  GET /api/calendar/earnings   — NSE earnings dates
  GET /api/calendar/all        — Combined, grouped by date bucket
"""

import logging

from fastapi import APIRouter, Query

from app.services.calendar_fetcher import (
    clear_calendar_cache,
    fetch_all_calendar_events,
    fetch_earnings_calendar,
    fetch_economic_calendar,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/calendar", tags=["calendar"])


@router.get("/economic")
async def get_economic_calendar():
    """
    Indian economic calendar for the next 14 days.
    Includes: RBI decisions, CPI, GDP, PMI, trade balance, forex reserves.
    """
    try:
        events = await fetch_economic_calendar()
        return {
            "status": "ok",
            "count": len(events),
            "events": events,
            "source": "investpy / curated fallback",
        }
    except Exception as exc:
        logger.error("Economic calendar endpoint error: %s", exc)
        return {"status": "error", "count": 0, "events": [], "message": str(exc)}


@router.get("/earnings")
async def get_earnings_calendar(force_refresh: bool = Query(False)):
    """
    Upcoming earnings dates for top NSE-listed companies.
    Includes forward EPS (Forecast) and trailing EPS (Previous) from yfinance.
    Use ?force_refresh=true to clear cache and fetch fresh data.
    """
    try:
        if force_refresh:
            clear_calendar_cache()
        events = await fetch_earnings_calendar()
        return {
            "status": "ok",
            "count": len(events),
            "events": events,
            "source": "yfinance",
        }
    except Exception as exc:
        logger.error("Earnings calendar endpoint error: %s", exc)
        return {"status": "error", "count": 0, "events": [], "message": str(exc)}


@router.get("/all")
async def get_all_calendar(force_refresh: bool = Query(False)):
    """
    Combined economic + earnings calendar, grouped by date bucket.
    Use ?force_refresh=true to bypass cache.
    """
    try:
        if force_refresh:
            clear_calendar_cache()
        grouped = await fetch_all_calendar_events()
        return {"status": "ok", **grouped}
    except Exception as exc:
        logger.error("Combined calendar endpoint error: %s", exc)
        return {
            "status": "error",
            "today": [], "tomorrow": [], "this_week": [],
            "upcoming": [], "recently_released": [],
            "total": 0,
            "message": str(exc),
        }
