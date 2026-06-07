"""
Forex data fetcher — pulls exchange rates from ExchangeRate-API.

All functions are async-compatible and can persist results directly to PostgreSQL.
Callable from both API routers and APScheduler background jobs.
"""

import logging
from datetime import datetime, timezone

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import async_session_factory
from app.models.forex_rate import ForexRate as ForexRateModel

logger = logging.getLogger(__name__)
settings = get_settings()

BASE_URL = "https://v6.exchangerate-api.com/v6"

# Currency pairs most relevant for Indian investors
INR_PAIRS = ["INR", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "SGD", "AED"]


# ═════════════════════════════════════════════════════════════════════════════
# PUBLIC ASYNC API — data fetching
# ═════════════════════════════════════════════════════════════════════════════

async def fetch_forex_rates(
    base: str = "USD",
    targets: list[str] | None = None,
) -> dict | None:
    """
    Fetch live exchange rates from ExchangeRate-API.

    Args:
        base: Base currency code (e.g. "USD").
        targets: Optional list of target currency codes to filter.

    Returns:
        Dict with keys: base, rates (dict[str, float]), fetched_at (datetime).
        None on failure or missing API key.
    """
    api_key = settings.EXCHANGE_RATE_API_KEY
    if not api_key:
        logger.warning("EXCHANGE_RATE_API_KEY not configured — skipping forex fetch")
        return None

    url = f"{BASE_URL}/{api_key}/latest/{base.upper()}"

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()

        if data.get("result") != "success":
            logger.error("ExchangeRate-API error response: %s", data.get("error-type", data))
            return None

        rates: dict[str, float] = data.get("conversion_rates", {})

        if targets:
            target_set = {t.upper() for t in targets}
            rates = {k: v for k, v in rates.items() if k in target_set}

        now = datetime.now(timezone.utc)
        logger.info(
            "Fetched %d forex rates for base=%s at %s",
            len(rates), base.upper(), now.isoformat(),
        )

        return {
            "base": base.upper(),
            "rates": rates,
            "fetched_at": now,
        }

    except httpx.HTTPStatusError as exc:
        logger.error("ExchangeRate-API HTTP %d: %s", exc.response.status_code, exc)
        return None
    except httpx.RequestError as exc:
        logger.error("ExchangeRate-API connection error: %s", exc)
        return None
    except Exception as exc:
        logger.error("Forex fetch failed unexpectedly: %s", exc)
        return None


async def fetch_inr_rates() -> dict | None:
    """
    Convenience function — fetch USD-based rates for INR and other key pairs.

    Returns:
        Dict with base="USD", rates for INR/EUR/GBP/JPY/AUD/CAD/CHF/SGD/AED.
    """
    return await fetch_forex_rates(base="USD", targets=INR_PAIRS)


# ═════════════════════════════════════════════════════════════════════════════
# PERSISTENCE — store fetched data into PostgreSQL
# ═════════════════════════════════════════════════════════════════════════════

async def persist_forex_rates(
    base: str = "USD",
    targets: list[str] | None = None,
    session: AsyncSession | None = None,
) -> int:
    """
    Fetch forex rates and persist each pair to the forex_rates table.

    If no session is provided, creates its own (for scheduler use).
    Returns the number of rows inserted.
    """
    data = await fetch_forex_rates(base=base, targets=targets)
    if not data or not data.get("rates"):
        return 0

    own_session = session is None
    if own_session:
        session = async_session_factory()

    try:
        fetched_at = data["fetched_at"]
        rows: list[ForexRateModel] = []

        for target_currency, rate_value in data["rates"].items():
            rows.append(ForexRateModel(
                base_currency=data["base"],
                target_currency=target_currency,
                rate=rate_value,
                fetched_at=fetched_at,
            ))

        session.add_all(rows)

        if own_session:
            await session.commit()

        logger.info("Persisted %d forex rates (base=%s)", len(rows), base)
        return len(rows)

    except Exception as exc:
        logger.error("Failed to persist forex rates: %s", exc)
        if own_session:
            await session.rollback()
        return 0
    finally:
        if own_session:
            await session.close()


async def persist_inr_rates(session: AsyncSession | None = None) -> int:
    """Convenience: fetch and persist INR-relevant pairs."""
    return await persist_forex_rates(base="USD", targets=INR_PAIRS, session=session)
