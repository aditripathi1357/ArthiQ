"""
Insights router -- AI-powered stock analysis via OpenAI gpt-4o-mini.

Endpoints:
  GET /api/insights/{symbol}/why-moved  -- AI explanation of price movement
  GET /api/insights/{symbol}/summary    -- buy/sell/hold signal + risk level

All endpoints gracefully fall back to rule-based responses if OpenAI fails.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.schemas.news import WhyMovedResponse, StockSummaryResponse
from app.services.ai_insights import explain_price_movement, get_stock_summary

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/insights", tags=["AI Insights"])


# ═════════════════════════════════════════════════════════════════════════════
# GET /api/insights/{symbol}/why-moved
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/{symbol}/why-moved", response_model=WhyMovedResponse)
async def why_did_stock_move(symbol: str):
    """
    AI-powered explanation of why a stock price moved.

    Uses 7-day price history and recent news headlines to generate
    a clear, retail-investor-friendly explanation via OpenAI gpt-4o-mini.
    Results are cached for 30 minutes.

    Falls back to rule-based analysis if OpenAI is unavailable.
    """
    try:
        result = await explain_price_movement(symbol)
    except Exception as exc:
        logger.error("explain_price_movement failed for %s: %s", symbol, exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze price movement for '{symbol}'.",
        )

    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"Could not fetch data for '{symbol}'. Verify the symbol is valid.",
        )

    return WhyMovedResponse(
        symbol=result["symbol"],
        date=result.get("date", datetime.now(timezone.utc).date().isoformat()),
        price_change_pct=result.get("price_change_pct"),
        explanation=result.get("explanation", "Analysis unavailable."),
        key_factors=result.get("key_factors", []),
        recent_news=result.get("recent_news", []),
        generated_at=datetime.fromisoformat(result["generated_at"])
            if isinstance(result.get("generated_at"), str)
            else result.get("generated_at", datetime.now(timezone.utc)),
        source=result.get("source", "unknown"),
    )


# ═════════════════════════════════════════════════════════════════════════════
# GET /api/insights/{symbol}/summary
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/{symbol}/summary", response_model=StockSummaryResponse)
async def get_stock_summary_endpoint(symbol: str):
    """
    AI-generated investment summary with buy/sell/hold signal.

    Analyzes current price, volume patterns, and detected signals
    via OpenAI gpt-4o-mini. Results are cached for 15 minutes.

    Falls back to rule-based analysis if OpenAI is unavailable.
    """
    try:
        result = await get_stock_summary(symbol)
    except Exception as exc:
        logger.error("get_stock_summary failed for %s: %s", symbol, exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate summary for '{symbol}'.",
        )

    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"Could not fetch data for '{symbol}'. Verify the symbol is valid.",
        )

    return StockSummaryResponse(
        symbol=result["symbol"],
        signal=result.get("signal", "hold"),
        risk_level=result.get("risk_level", "medium"),
        confidence=result.get("confidence", 0.0),
        reasoning=result.get("reasoning", "Analysis unavailable."),
        key_metrics=result.get("key_metrics", {}),
        generated_at=datetime.fromisoformat(result["generated_at"])
            if isinstance(result.get("generated_at"), str)
            else result.get("generated_at", datetime.now(timezone.utc)),
        source=result.get("source", "unknown"),
    )

# ═════════════════════════════════════════════════════════════════════════════
# GET /api/insights/market/weekly-outlook
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/market/weekly-outlook")
async def get_weekly_outlook_endpoint():
    """Generates market-wide outlook caching for 6 hours."""
    from app.services.ai_insights import get_weekly_nifty_outlook
    try:
        result = await get_weekly_nifty_outlook()
        return result
    except Exception as exc:
        logger.error("get_weekly_nifty_outlook failed: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to generate weekly outlook.")

# ═════════════════════════════════════════════════════════════════════════════
# GET /api/insights/{symbol}/outlook
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/{symbol}/outlook")
async def get_stock_outlook(symbol: str):
    """Generates 2-4 week stock outlook using Technicals & AI."""
    from app.services.ai_insights import predict_price_outlook
    try:
        result = await predict_price_outlook(symbol)
        return result
    except Exception as exc:
        logger.error("predict_price_outlook failed for %s: %s", symbol, exc)
        raise HTTPException(status_code=500, detail="Failed to generate outlook.")
