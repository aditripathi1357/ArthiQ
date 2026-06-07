"""
Virtual Trading Router
======================
REST API for the paper trading simulator.

All endpoints require X-User-Id header (Supabase user UUID).

Endpoints:
  GET  /api/trade/account         — Get/create account (auto monthly reset)
  GET  /api/trade/portfolio       — Holdings + live prices + unrealized P&L
  POST /api/trade/buy             — Buy a stock
  POST /api/trade/sell            — Sell a stock
  GET  /api/trade/transactions    — Trade history
  GET  /api/trade/leaderboard     — Monthly top 10 + user rank
  GET  /api/trade/achievements    — Badge unlocks
  GET  /api/trade/ai-coach        — AI portfolio insights
  POST /api/trade/reset           — Force reset (dev/testing)
"""

import logging
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel, field_validator
from sqlalchemy import select

from app.database import async_session_factory
from app.models.virtual_account import VirtualAccount
from app.models.virtual_transaction import VirtualTransaction
from app.services import virtual_trading_svc as svc

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/trade", tags=["Virtual Trading"])


# ═══════════════════════════════════════════════════════════════════════════════
# Pydantic schemas
# ═══════════════════════════════════════════════════════════════════════════════

class BuyRequest(BaseModel):
    symbol: str
    quantity: int
    company_name: Optional[str] = None

    @field_validator("symbol")
    @classmethod
    def normalize(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("quantity")
    @classmethod
    def positive_qty(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Quantity must be at least 1")
        return v


class SellRequest(BaseModel):
    symbol: str
    quantity: int

    @field_validator("symbol")
    @classmethod
    def normalize(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("quantity")
    @classmethod
    def positive_qty(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Quantity must be at least 1")
        return v


# ═══════════════════════════════════════════════════════════════════════════════
# Auth helper
# ═══════════════════════════════════════════════════════════════════════════════

def _uid(x_user_id: str | None) -> str:
    if not x_user_id or not x_user_id.strip():
        raise HTTPException(status_code=401, detail="X-User-Id header required. Please log in.")
    return x_user_id.strip()


# ═══════════════════════════════════════════════════════════════════════════════
# Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/account")
async def get_account(x_user_id: str | None = Header(default=None)):
    """Get virtual account summary. Creates account if first visit; resets if new month."""
    uid = _uid(x_user_id)
    try:
        async with async_session_factory() as session:
            account = await svc.get_or_create_account(uid, session)
            await session.commit()
            return {
                "user_id":         uid,
                "cash_balance":    float(account.cash_balance),
                "invested_amount": float(account.invested_amount),
                "portfolio_value": float(account.portfolio_value),
                "realized_pnl":    float(account.realized_pnl),
                "reset_date":      account.reset_date.isoformat(),
                "monthly_allowance": 100_000,
            }
    except Exception as exc:
        logger.error("get_account failed for %s: %s", uid, exc)
        raise HTTPException(status_code=500, detail="Could not load account.")


@router.get("/portfolio")
async def get_portfolio(x_user_id: str | None = Header(default=None)):
    """Full portfolio: account summary + enriched holdings with live prices."""
    uid = _uid(x_user_id)
    try:
        return await svc.get_portfolio(uid)
    except Exception as exc:
        logger.error("get_portfolio failed for %s: %s", uid, exc)
        raise HTTPException(status_code=500, detail="Could not load portfolio.")


@router.post("/buy")
async def buy_stock(body: BuyRequest, x_user_id: str | None = Header(default=None)):
    """Buy a stock at the current live market price."""
    uid = _uid(x_user_id)
    try:
        result = await svc.execute_buy(
            user_id=uid,
            symbol=body.symbol,
            company_name=body.company_name or "",
            quantity=body.quantity,
        )
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("buy_stock failed for %s %s: %s", uid, body.symbol, exc)
        raise HTTPException(status_code=500, detail="Trade execution failed.")


@router.post("/sell")
async def sell_stock(body: SellRequest, x_user_id: str | None = Header(default=None)):
    """Sell a stock at the current live market price."""
    uid = _uid(x_user_id)
    try:
        result = await svc.execute_sell(
            user_id=uid,
            symbol=body.symbol,
            quantity=body.quantity,
        )
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("sell_stock failed for %s %s: %s", uid, body.symbol, exc)
        raise HTTPException(status_code=500, detail="Trade execution failed.")


@router.get("/transactions")
async def get_transactions(
    limit: int = Query(default=50, le=200),
    symbol: Optional[str] = Query(default=None),
    x_user_id: str | None = Header(default=None),
):
    """Get trade history, optionally filtered by symbol."""
    uid = _uid(x_user_id)
    try:
        async with async_session_factory() as session:
            q = select(VirtualTransaction).where(VirtualTransaction.user_id == uid)
            if symbol:
                sym = symbol.upper()
                q = q.where(
                    (VirtualTransaction.stock_symbol == sym) | 
                    (VirtualTransaction.stock_symbol == sym + ".NS")
                )
            q = q.order_by(VirtualTransaction.timestamp.desc()).limit(limit)
            result = await session.execute(q)
            txns = result.scalars().all()

        return {
            "transactions": [
                {
                    "id":               str(t.id),
                    "symbol":           t.stock_symbol,
                    "company_name":     t.company_name or t.stock_symbol.replace(".NS", ""),
                    "type":             t.transaction_type,
                    "quantity":         t.quantity,
                    "price":            float(t.price),
                    "total_value":      float(t.total_value),
                    "realized_pnl":     float(t.realized_pnl),
                    "timestamp":        t.timestamp.isoformat() if t.timestamp else None,
                }
                for t in txns
            ],
            "total": len(txns),
        }
    except Exception as exc:
        logger.error("get_transactions failed for %s: %s", uid, exc)
        raise HTTPException(status_code=500, detail="Could not load transactions.")


@router.get("/leaderboard")
async def get_leaderboard(x_user_id: str | None = Header(default=None)):
    """Monthly leaderboard — top 10 + current user's rank."""
    uid = _uid(x_user_id)
    try:
        return await svc.get_leaderboard(uid)
    except Exception as exc:
        logger.error("get_leaderboard failed: %s", exc)
        raise HTTPException(status_code=500, detail="Could not load leaderboard.")


@router.get("/achievements")
async def get_achievements(x_user_id: str | None = Header(default=None)):
    """Return badge unlock status for the current user."""
    uid = _uid(x_user_id)
    try:
        badges = await svc.get_achievements(uid)
        return {"achievements": badges}
    except Exception as exc:
        logger.error("get_achievements failed for %s: %s", uid, exc)
        raise HTTPException(status_code=500, detail="Could not load achievements.")


@router.get("/ai-coach")
async def get_ai_coach(x_user_id: str | None = Header(default=None)):
    """AI-generated coaching insights about the user's portfolio."""
    uid = _uid(x_user_id)
    try:
        return await svc.get_ai_coach_insights(uid)
    except Exception as exc:
        logger.error("get_ai_coach failed for %s: %s", uid, exc)
        raise HTTPException(status_code=500, detail="Could not generate AI insights.")


@router.post("/reset")
async def reset_account(x_user_id: str | None = Header(default=None)):
    """Force reset the virtual account to ₹1,00,000. Useful for testing."""
    from decimal import Decimal
    from datetime import date
    uid = _uid(x_user_id)
    try:
        from sqlalchemy import delete
        async with async_session_factory() as session:
            account = await svc.get_or_create_account(uid, session)
            # Wipe holdings
            await session.execute(
                delete(
                    __import__("app.models.virtual_holding", fromlist=["VirtualHolding"])
                    .VirtualHolding
                ).where(
                    __import__("app.models.virtual_holding", fromlist=["VirtualHolding"])
                    .VirtualHolding.account_id == account.id
                )
            )
            account.cash_balance    = Decimal("100000")
            account.invested_amount = Decimal("0")
            account.portfolio_value = Decimal("100000")
            account.realized_pnl    = Decimal("0")
            account.reset_date      = date.today()
            await session.commit()
        return {"success": True, "message": "Account reset to ₹1,00,000"}
    except Exception as exc:
        logger.error("reset_account failed for %s: %s", uid, exc)
        raise HTTPException(status_code=500, detail="Could not reset account.")
