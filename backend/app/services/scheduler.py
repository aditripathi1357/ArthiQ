"""
Background scheduler — periodic data fetching jobs via APScheduler.

Fetches stock prices, news, and forex rates on configurable intervals.
Uses the service layer for all data operations.
"""

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.config import get_settings
from app.utils.company_data import COMPANY_NAMES

logger = logging.getLogger(__name__)
settings = get_settings()

scheduler = AsyncIOScheduler()

# Tracked symbols for scheduled fetching
# (name → symbol format is inverted from COMPANY_NAMES for iteration convenience)
_TRACKED_SYMBOLS = [
    "RELIANCE.NS", "TCS.NS", "INFY.NS",
    "HDFCBANK.NS", "MARUTI.NS", "ICICIBANK.NS",
]
TRACKED_COMPANIES: dict[str, str] = {
    COMPANY_NAMES[sym]: sym for sym in _TRACKED_SYMBOLS
}


# ═════════════════════════════════════════════════════════════════════════════
# JOB DEFINITIONS
# ═════════════════════════════════════════════════════════════════════════════

async def _job_fetch_stock_prices():
    """
    Fetch latest stock quotes for all tracked companies.
    Runs every STOCK_FETCH_INTERVAL_MINUTES (default: 5 min).
    """
    from app.services.stock_fetcher import persist_stock_quote

    logger.info("[Scheduler] ── Stock price fetch started ──")
    success, failed = 0, 0

    for symbol in TRACKED_COMPANIES.values():
        try:
            result = await persist_stock_quote(symbol)
            if result:
                success += 1
            else:
                failed += 1
        except Exception as exc:
            logger.error("[Scheduler] Stock fetch error for %s: %s", symbol, exc)
            failed += 1

    logger.info(
        "[Scheduler] ── Stock price fetch done: %d success, %d failed ──",
        success, failed,
    )


async def _job_fetch_news():
    """
    Fetch latest news for all tracked companies.
    Runs every NEWS_FETCH_INTERVAL_MINUTES (default: 15 min).
    """
    from app.services.news_fetcher import persist_company_news

    logger.info("[Scheduler] ── News fetch started ──")
    total_new = 0

    for company_name, symbol in TRACKED_COMPANIES.items():
        try:
            count = await persist_company_news(company_name, symbol, page_size=10)
            total_new += count
        except Exception as exc:
            logger.error("[Scheduler] News fetch error for %s: %s", symbol, exc)

    logger.info("[Scheduler] ── News fetch done: %d new articles ──", total_new)


async def _job_fetch_forex():
    """
    Fetch latest forex rates.
    Runs every FOREX_FETCH_INTERVAL_MINUTES (default: 30 min).
    """
    from app.services.forex_fetcher import persist_inr_rates

    logger.info("[Scheduler] ── Forex rate fetch started ──")

    try:
        count = await persist_inr_rates()
        logger.info("[Scheduler] ── Forex rate fetch done: %d pairs persisted ──", count)
    except Exception as exc:
        logger.error("[Scheduler] Forex fetch error: %s", exc)


# ═════════════════════════════════════════════════════════════════════════════
# LIFECYCLE — start/stop from FastAPI lifespan
# ═════════════════════════════════════════════════════════════════════════════


async def _job_refresh_nse_master():
    """Refresh the NSE company master list (cached for 24h)."""
    from app.services.nse_master import refresh_nse_master

    logger.info("[Scheduler] ── NSE master list refresh started ──")
    try:
        count = await refresh_nse_master()
        logger.info("[Scheduler] ── NSE master list refreshed: %d companies ──", count)
    except Exception as exc:
        logger.error("[Scheduler] NSE master refresh error: %s", exc)


async def _job_refresh_market_snapshot():
    """Refresh the market-wide snapshot cache (top movers data)."""
    from app.routers.market import _refresh_market_snapshot

    logger.info("[Scheduler] ── Market snapshot refresh started ──")
    try:
        await _refresh_market_snapshot()
        logger.info("[Scheduler] ── Market snapshot refresh done ──")
    except Exception as exc:
        logger.error("[Scheduler] Market snapshot refresh error: %s", exc)


async def _job_refresh_research_reports():
    """
    Refresh AI research reports for all symbols tracked in any user's research list.
    Runs every RESEARCH_REPORT_INTERVAL_HOURS (default: 6h).
    """
    from sqlalchemy import select
    from app.database import async_session_factory
    from app.models.research_item import ResearchItem
    from app.services.research_engine import generate_research_report, persist_report_to_db

    logger.info("[Scheduler] ── Research report refresh started ──")

    try:
        async with async_session_factory() as session:
            result = await session.execute(select(ResearchItem.stock_symbol).distinct())
            symbols = [row[0] for row in result.all()]

        if not symbols:
            logger.info("[Scheduler] No symbols in any research list — skipping")
            return

        success, failed = 0, 0
        for symbol in symbols:
            try:
                report = await generate_research_report(symbol, force=True)
                ok = await persist_report_to_db(symbol, report)
                if ok:
                    success += 1
                else:
                    failed += 1
            except Exception as exc:
                logger.error("[Scheduler] Research report error for %s: %s", symbol, exc)
                failed += 1

        logger.info(
            "[Scheduler] ── Research reports: %d refreshed, %d failed ──",
            success, failed
        )
    except Exception as exc:
        logger.error("[Scheduler] Research report refresh error: %s", exc)


async def _job_send_daily_digest():
    """
    Send daily research digest to all subscribed users.
    Runs daily at 8:00 AM IST (2:30 AM UTC).
    """
    from app.services.notification_dispatcher import dispatch_daily_digest_to_all

    logger.info("[Scheduler] ── Daily digest send started ──")
    try:
        sent = await dispatch_daily_digest_to_all()
        logger.info("[Scheduler] ── Daily digest sent to %d users ──", sent)
    except Exception as exc:
        logger.error("[Scheduler] Daily digest error: %s", exc)



def start_scheduler():
    """Register jobs and start the APScheduler event loop."""

    # ── Stock prices: every N minutes ────────────────────────────────────
    scheduler.add_job(
        _job_fetch_stock_prices,
        trigger=IntervalTrigger(minutes=settings.STOCK_FETCH_INTERVAL_MINUTES),
        id="fetch_stock_prices",
        name="Fetch stock prices for tracked companies",
        replace_existing=True,
        max_instances=1,
        misfire_grace_time=60,
    )

    # ── News: every N minutes ────────────────────────────────────────────
    scheduler.add_job(
        _job_fetch_news,
        trigger=IntervalTrigger(minutes=settings.NEWS_FETCH_INTERVAL_MINUTES),
        id="fetch_news",
        name="Fetch news for tracked companies",
        replace_existing=True,
        max_instances=1,
        misfire_grace_time=120,
    )

    # ── Forex: every N minutes ───────────────────────────────────────────
    scheduler.add_job(
        _job_fetch_forex,
        trigger=IntervalTrigger(minutes=settings.FOREX_FETCH_INTERVAL_MINUTES),
        id="fetch_forex",
        name="Fetch forex rates",
        replace_existing=True,
        max_instances=1,
        misfire_grace_time=120,
    )

    # ── NSE master list: refresh daily ───────────────────────────────────
    scheduler.add_job(
        _job_refresh_nse_master,
        trigger=IntervalTrigger(hours=24),
        id="refresh_nse_master",
        name="Refresh NSE company master list",
        replace_existing=True,
        max_instances=1,
    )

    # ── Market snapshot: every 2 minutes ─────────────────────────────────
    scheduler.add_job(
        _job_refresh_market_snapshot,
        trigger=IntervalTrigger(minutes=2),
        id="refresh_market_snapshot",
        name="Refresh market snapshot (top movers)",
        replace_existing=True,
        max_instances=1,
    )

    # ── AI Research reports: every 6 hours ────────────────────────────────
    scheduler.add_job(
        _job_refresh_research_reports,
        trigger=IntervalTrigger(hours=settings.RESEARCH_REPORT_INTERVAL_HOURS),
        id="refresh_research_reports",
        name="Refresh AI research reports for all tracked stocks",
        replace_existing=True,
        max_instances=1,
        misfire_grace_time=300,
    )

    # ── Daily digest: every day at 8:00 AM IST (2:30 UTC) ───────────────
    scheduler.add_job(
        _job_send_daily_digest,
        trigger=CronTrigger(hour=2, minute=30, timezone="UTC"),  # 8:00 AM IST
        id="send_daily_digest",
        name="Send daily research digest to all subscribed users",
        replace_existing=True,
        max_instances=1,
        misfire_grace_time=600,
    )

    scheduler.start()
    jobs = scheduler.get_jobs()
    logger.info(
        "APScheduler started with %d jobs: %s",
        len(jobs),
        ", ".join(f"{j.name} (every {j.trigger})" for j in jobs),
    )


def stop_scheduler():
    """Gracefully shut down the scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped")
