"""
Arthiq Intelligence Platform -- FastAPI entry point.

Registers all routers, middleware, event handlers, and the background scheduler.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.config import get_settings
from app.database import engine, Base
from app.routers import companies, stocks, forex, news, insights, market, chat
from app.routers import calendar as calendar_router
from app.routers import notifications as notifications_router
from app.routers import virtual_trading as virtual_trading_router
from app.services.scheduler import start_scheduler, stop_scheduler

settings = get_settings()

# -- Logging -------------------------------------------------------------------
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s -- %(message)s",
)
logger = logging.getLogger(__name__)

# Suppress overly-verbose cache DEBUG noise (hits/misses fire thousands of times)
logging.getLogger("app.utils.cache").setLevel(logging.WARNING)
logging.getLogger("apscheduler").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)


async def _create_tables():
    """
    Auto-create all ORM tables if they don't exist yet.
    This is safe to run every startup — `checkfirst=True` skips existing tables.
    On Render's free PostgreSQL the tables may never have been migrated, so we
    create them directly from the SQLAlchemy metadata as a reliable fallback.
    """
    import app.models  # noqa: F401 — registers all models with Base.metadata
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all, checkfirst=True)
        logger.info("DB tables verified / created OK")
    except Exception as exc:
        logger.error("DB table creation failed (non-fatal): %s", exc)


async def _init_market_data():
    """Warm up NSE master list and market movers snapshot on startup."""
    try:
        from app.services import nse_master
        from app.routers.market import _refresh_market_snapshot
        
        # 1. Warm up NSE master list
        await nse_master.refresh_nse_master()
        
        # 2. Warm up market snapshot (gainers/losers)
        await _refresh_market_snapshot()
    except Exception as exc:
        logger.warning("Market data startup warming failed: %s", exc)


# -- Lifespan (startup / shutdown) ---------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle -- startup & shutdown hooks."""
    logger.info(
        "Starting %s v%s (%s)",
        settings.APP_NAME, settings.APP_VERSION, settings.ENVIRONMENT,
    )
    # Ensure all DB tables exist before accepting requests
    await _create_tables()

    start_scheduler()

    # Warm up market data in the background
    import asyncio
    asyncio.create_task(_init_market_data())

    yield
    stop_scheduler()
    logger.info("Shutting down %s", settings.APP_NAME)


# -- App factory ---------------------------------------------------------------
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Next-generation financial intelligence platform. "
        "Live prices, AI insights, news sentiment, and company relationship graphs."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# -- CORS (allow all origins for development) ----------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# -- GZip compression (reduces payload size ~50-70%) --------------------------
app.add_middleware(GZipMiddleware, minimum_size=500)

# -- Routers -------------------------------------------------------------------
app.include_router(companies.router, prefix="/api")
app.include_router(stocks.router, prefix="/api")
app.include_router(forex.router, prefix="/api")
app.include_router(news.router, prefix="/api")
app.include_router(insights.router, prefix="/api")
app.include_router(market.router)         # /api/market prefix set in router
app.include_router(calendar_router.router)  # /api/calendar prefix set in router
app.include_router(chat.router)
app.include_router(notifications_router.router)  # /api/notifications prefix set in router
app.include_router(virtual_trading_router.router)  # /api/trade prefix set in router



# -- Health check --------------------------------------------------------------
@app.get("/health", tags=["System"])
async def health_check():
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }


@app.get("/debug/db", tags=["System"])
async def debug_db():
    """Check database connectivity and show which DB host is configured."""
    import re
    url = settings.DATABASE_URL
    # Mask password but show host so we can diagnose connection issues
    masked = re.sub(r'://([^:]+):([^@]+)@', r'://\1:***@', url)
    db_ok = False
    db_error = None
    try:
        async with engine.begin() as conn:
            await conn.run_sync(lambda c: c.execute(__import__('sqlalchemy').text('SELECT 1')))
        db_ok = True
    except Exception as exc:
        db_error = str(exc)
    return {
        "db_url_masked": masked,
        "db_connected": db_ok,
        "db_error": db_error,
        "has_database_url_env": bool(__import__('os').environ.get('DATABASE_URL') or __import__('os').environ.get('database_url')),
    }


@app.get("/", tags=["System"])
async def root():
    """API root -- redirect to docs."""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "companies": "/api/companies/search?q=reliance",
            "stocks": "/api/stocks/RELIANCE.NS/quote",
            "forex": "/api/forex/rates",
            "news": "/api/news/RELIANCE.NS",
            "insights": "/api/insights/RELIANCE.NS/why-moved",
            "market": "/api/market/overview",
            "indices": "/api/market/indices",
            "all_stocks": "/api/market/stocks?page=1&per_page=50",
            "calendar": "/api/calendar/all",
            "earnings": "/api/calendar/earnings",
            "economic": "/api/calendar/economic",
            "notifications_profile": "/api/notifications/profile",
            "research_list": "/api/notifications/research-list",
            "research_reports": "/api/notifications/reports/{symbol}",
        },
    }
