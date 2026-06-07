"""
Forex router -- exchange rates from DB and live ExchangeRate-API.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.forex_rate import ForexRate as ForexRateModel
from app.schemas.stock import (
    ForexRatesResponse,
    ForexPairResponse,
    ForexRateItem,
)
from app.services.forex_fetcher import fetch_forex_rates

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/forex", tags=["Forex"])


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

async def _get_latest_rates_from_db(
    db: AsyncSession,
    base: str = "USD",
    targets: list[str] | None = None,
) -> dict[str, float] | None:
    """Pull the most recent batch of rates from DB for a given base currency."""
    try:
        # Get the most recent fetched_at timestamp for this base
        latest_ts_result = await db.execute(
            select(ForexRateModel.fetched_at)
            .where(ForexRateModel.base_currency == base)
            .order_by(desc(ForexRateModel.fetched_at))
            .limit(1)
        )
        latest_ts = latest_ts_result.scalar_one_or_none()
        if not latest_ts:
            return None

        query = (
            select(ForexRateModel)
            .where(ForexRateModel.base_currency == base)
            .where(ForexRateModel.fetched_at == latest_ts)
        )
        if targets:
            query = query.where(ForexRateModel.target_currency.in_([t.upper() for t in targets]))

        result = await db.execute(query)
        rows = result.scalars().all()

        if not rows:
            return None

        return {
            "rates": {r.target_currency: float(r.rate) for r in rows},
            "fetched_at": latest_ts,
        }
    except Exception as exc:
        logger.warning("DB forex lookup failed (falling back to live API): %s", exc)
        return None


# ═════════════════════════════════════════════════════════════════════════════
# GET /api/forex/rates
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/rates", response_model=ForexRatesResponse)
async def get_all_forex_rates(
    base: str = Query("USD", max_length=5, description="Base currency code"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all stored forex rates for a base currency.

    Returns latest batch from DB if available; otherwise fetches live.
    """
    from app.utils.cache import get_cached, set_cached
    cache_key = ("forex_rates", base.upper())
    cached = get_cached(cache_key, 1800)  # 30 minutes cache
    if cached is not None:
        return ForexRatesResponse(**cached)

    # Try DB first
    db_data = await _get_latest_rates_from_db(db, base=base.upper())
    if db_data and db_data["rates"]:
        res_rates = ForexRatesResponse(
            base=base.upper(),
            total=len(db_data["rates"]),
            rates=db_data["rates"],
            fetched_at=db_data["fetched_at"],
            source="database",
        )
        set_cached(cache_key, res_rates.model_dump(mode='json'))
        return res_rates

    # Fallback: live API
    live_data = await fetch_forex_rates(base=base)
    if not live_data or not live_data.get("rates"):
        raise HTTPException(
            status_code=503,
            detail="Forex rates unavailable at the moment. Please try again later.",
        )

    res_rates = ForexRatesResponse(
        base=live_data["base"],
        total=len(live_data["rates"]),
        rates=live_data["rates"],
        fetched_at=live_data["fetched_at"],
        source="exchangerate-api",
    )
    set_cached(cache_key, res_rates.model_dump(mode='json'))
    return res_rates


# ═════════════════════════════════════════════════════════════════════════════
# GET /api/forex/inr
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/inr", response_model=ForexRatesResponse)
async def get_inr_rates(
    db: AsyncSession = Depends(get_db),
):
    """
    Get key INR exchange rates: USD/INR, EUR/INR, GBP/INR.

    Returns cross-rates with INR derived from USD-based rates.
    """
    from app.utils.cache import get_cached, set_cached
    cache_key = "forex_inr_rates"
    cached = get_cached(cache_key, 1800)  # 30 minutes cache
    if cached is not None:
        return ForexRatesResponse(**cached)

    targets = ["INR", "EUR", "GBP"]

    # Try DB
    db_data = await _get_latest_rates_from_db(db, base="USD", targets=targets)
    if db_data and db_data["rates"] and "INR" in db_data["rates"]:
        inr_rate = db_data["rates"]["INR"]
        inr_rates = {}
        for currency, usd_rate in db_data["rates"].items():
            if currency == "INR":
                inr_rates["USD-INR"] = round(inr_rate, 4)
            else:
                # Cross rate: e.g. EUR/INR = (USD/INR) / (USD/EUR)
                if usd_rate > 0:
                    inr_rates[f"{currency}-INR"] = round(inr_rate / usd_rate, 4)

        res_inr = ForexRatesResponse(
            base="INR",
            total=len(inr_rates),
            rates=inr_rates,
            fetched_at=db_data["fetched_at"],
            source="database",
        )
        set_cached(cache_key, res_inr.model_dump(mode='json'))
        return res_inr

    # Fallback: live
    live_data = await fetch_forex_rates(base="USD", targets=targets)
    if not live_data or "INR" not in live_data.get("rates", {}):
        raise HTTPException(
            status_code=503,
            detail="INR rates unavailable at the moment. Please try again later.",
        )

    inr_rate = live_data["rates"]["INR"]
    inr_rates = {}
    for currency, usd_rate in live_data["rates"].items():
        if currency == "INR":
            inr_rates["USD-INR"] = round(inr_rate, 4)
        else:
            if usd_rate > 0:
                inr_rates[f"{currency}-INR"] = round(inr_rate / usd_rate, 4)

    res_inr = ForexRatesResponse(
        base="INR",
        total=len(inr_rates),
        rates=inr_rates,
        fetched_at=live_data["fetched_at"],
        source="exchangerate-api",
    )
    set_cached(cache_key, res_inr.model_dump(mode='json'))
    return res_inr


# ═════════════════════════════════════════════════════════════════════════════
# GET /api/forex/{pair}  (e.g. /api/forex/USD-INR)
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/{pair}", response_model=ForexPairResponse)
async def get_forex_pair(
    pair: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get a single forex pair rate.

    Pair format: BASE-TARGET (e.g. USD-INR, EUR-GBP).
    """
    parts = pair.upper().split("-")
    if len(parts) != 2:
        raise HTTPException(
            status_code=400,
            detail="Invalid pair format. Use BASE-TARGET (e.g. USD-INR).",
        )

    base, target = parts

    # Try DB
    try:
        result = await db.execute(
            select(ForexRateModel)
            .where(ForexRateModel.base_currency == base)
            .where(ForexRateModel.target_currency == target)
            .order_by(desc(ForexRateModel.fetched_at))
            .limit(1)
        )
        row = result.scalar_one_or_none()

        if row:
            return ForexPairResponse(
                pair=pair.upper(),
                base=base,
                target=target,
                rate=float(row.rate),
                fetched_at=row.fetched_at,
                source="database",
            )
    except Exception as exc:
        logger.warning("DB forex pair lookup failed: %s", exc)

    # Fallback: live
    live_data = await fetch_forex_rates(base=base, targets=[target])
    if not live_data or target not in live_data.get("rates", {}):
        raise HTTPException(
            status_code=404,
            detail=f"Rate for {pair.upper()} not found. Check currency codes.",
        )

    return ForexPairResponse(
        pair=pair.upper(),
        base=base,
        target=target,
        rate=live_data["rates"][target],
        fetched_at=live_data["fetched_at"],
        source="exchangerate-api",
    )
