"""
Virtual Trading Service
=======================
Core business logic for the paper trading simulator.

Handles:
  - Account creation / monthly reset
  - Buy / Sell execution with P&L calculation
  - Portfolio valuation using live prices
  - Leaderboard ranking
  - Achievement detection
  - AI coach analysis
"""

import logging
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import select, update, func as sqlfunc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.models.virtual_account import VirtualAccount
from app.models.virtual_holding import VirtualHolding
from app.models.virtual_transaction import VirtualTransaction
from app.models.monthly_leaderboard import MonthlyLeaderboard

logger = logging.getLogger(__name__)

MONTHLY_ALLOWANCE = Decimal("100000.00")


# ═══════════════════════════════════════════════════════════════════════════════
# Account helpers
# ═══════════════════════════════════════════════════════════════════════════════

async def get_or_create_account(user_id: str, session: AsyncSession) -> VirtualAccount:
    """
    Return the user's VirtualAccount, creating it if it doesn't exist.
    Also triggers a monthly reset if it's a new month.
    """
    result = await session.execute(
        select(VirtualAccount).where(VirtualAccount.user_id == user_id)
    )
    account = result.scalar_one_or_none()

    today = date.today()

    if not account:
        account = VirtualAccount(
            user_id=user_id,
            cash_balance=MONTHLY_ALLOWANCE,
            invested_amount=Decimal("0"),
            portfolio_value=MONTHLY_ALLOWANCE,
            realized_pnl=Decimal("0"),
            reset_date=today,
        )
        session.add(account)
        await session.flush()
        logger.info("Created virtual account for user %s", user_id)
        return account

    # Monthly reset — if it's a new month since the last reset
    if (today.year, today.month) > (account.reset_date.year, account.reset_date.month):
        await _do_monthly_reset(account, session)

    return account


async def _do_monthly_reset(account: VirtualAccount, session: AsyncSession) -> None:
    """Archive leaderboard entry and reset account for new month."""
    today = date.today()
    prev_month = account.reset_date.month
    prev_year  = account.reset_date.year

    # Upsert leaderboard entry for the just-ended month
    lb_result = await session.execute(
        select(MonthlyLeaderboard).where(
            MonthlyLeaderboard.user_id == account.user_id,
            MonthlyLeaderboard.month == prev_month,
            MonthlyLeaderboard.year == prev_year,
        )
    )
    lb = lb_result.scalar_one_or_none()
    final_value = float(account.portfolio_value)
    ret_pct = ((final_value - 100_000) / 100_000) * 100

    if lb:
        lb.portfolio_value   = Decimal(str(final_value))
        lb.return_percentage = Decimal(str(round(ret_pct, 4)))
    else:
        display_name = account.user_id.split("@")[0] if "@" in account.user_id else f"Trader"
        lb = MonthlyLeaderboard(
            user_id=account.user_id,
            account_id=account.id,
            display_name=display_name,
            month=prev_month,
            year=prev_year,
            starting_balance=MONTHLY_ALLOWANCE,
            portfolio_value=Decimal(str(final_value)),
            return_percentage=Decimal(str(round(ret_pct, 4))),
        )
        session.add(lb)

    # Wipe holdings and reset balances
    await session.execute(
        # delete holdings for this account
        __import__("sqlalchemy", fromlist=["delete"]).delete(VirtualHolding)
        .where(VirtualHolding.account_id == account.id)
    )

    account.cash_balance    = MONTHLY_ALLOWANCE
    account.invested_amount = Decimal("0")
    account.portfolio_value = MONTHLY_ALLOWANCE
    account.realized_pnl    = Decimal("0")
    account.reset_date      = today
    logger.info("Monthly reset done for user %s", account.user_id)


# ═══════════════════════════════════════════════════════════════════════════════
# Live price helper
# ═══════════════════════════════════════════════════════════════════════════════

async def get_live_price(symbol: str) -> Optional[float]:
    """Fetch current price using the existing stock fetcher + cache."""
    try:
        from app.services.stock_fetcher import fetch_batch_quotes
        results = await fetch_batch_quotes([symbol])
        if results:
            return results[0].get("price") or results[0].get("close")
    except Exception as exc:
        logger.error("get_live_price(%s) failed: %s", symbol, exc)
    return None


# ═══════════════════════════════════════════════════════════════════════════════
# Trade execution
# ═══════════════════════════════════════════════════════════════════════════════

async def execute_buy(
    user_id: str,
    symbol: str,
    company_name: str,
    quantity: int,
) -> dict:
    """
    Execute a virtual BUY order.
    Returns result dict with success flag and updated account summary.
    """
    from app.services.stock_fetcher import resolve_stock_symbol
    symbol = await resolve_stock_symbol(symbol)

    price = await get_live_price(symbol)
    if not price or price <= 0:
        return {"success": False, "error": f"Could not fetch live price for {symbol}"}

    total_cost = Decimal(str(round(price * quantity, 2)))

    async with async_session_factory() as session:
        account = await get_or_create_account(user_id, session)

        if account.cash_balance < total_cost:
            return {
                "success": False,
                "error": (
                    f"Insufficient balance. Need ₹{total_cost:,.2f} "
                    f"but have ₹{account.cash_balance:,.2f}"
                ),
            }

        # Update or create holding
        h_result = await session.execute(
            select(VirtualHolding).where(
                VirtualHolding.account_id == account.id,
                VirtualHolding.stock_symbol == symbol,
            )
        )
        holding = h_result.scalar_one_or_none()

        if holding:
            # Weighted average price
            old_value = Decimal(str(holding.quantity)) * holding.average_price
            new_value = Decimal(str(quantity)) * Decimal(str(price))
            new_qty   = holding.quantity + quantity
            holding.average_price = (old_value + new_value) / Decimal(str(new_qty))
            holding.quantity      = new_qty
            holding.company_name  = company_name or holding.company_name
        else:
            holding = VirtualHolding(
                user_id=user_id,
                account_id=account.id,
                stock_symbol=symbol,
                company_name=company_name or symbol.replace(".NS", ""),
                quantity=quantity,
                average_price=Decimal(str(price)),
            )
            session.add(holding)

        # Record transaction
        txn = VirtualTransaction(
            user_id=user_id,
            account_id=account.id,
            stock_symbol=symbol,
            company_name=company_name or symbol.replace(".NS", ""),
            transaction_type="BUY",
            quantity=quantity,
            price=Decimal(str(price)),
            total_value=total_cost,
            realized_pnl=Decimal("0"),
        )
        session.add(txn)

        # Deduct cash
        account.cash_balance    -= total_cost
        account.invested_amount += total_cost

        await session.commit()
        await _update_leaderboard(user_id, account, session)

        return {
            "success": True,
            "symbol": symbol,
            "quantity": quantity,
            "price": round(price, 2),
            "total_cost": float(total_cost),
            "cash_remaining": float(account.cash_balance),
            "message": f"Bought {quantity} shares of {symbol} at ₹{price:,.2f}",
        }


async def execute_sell(
    user_id: str,
    symbol: str,
    quantity: int,
) -> dict:
    """
    Execute a virtual SELL order.
    Returns result dict with realized P&L and updated account summary.
    """
    from app.services.stock_fetcher import resolve_stock_symbol
    symbol = await resolve_stock_symbol(symbol)

    price = await get_live_price(symbol)
    if not price or price <= 0:
        return {"success": False, "error": f"Could not fetch live price for {symbol}"}

    async with async_session_factory() as session:
        account = await get_or_create_account(user_id, session)

        h_result = await session.execute(
            select(VirtualHolding).where(
                VirtualHolding.account_id == account.id,
                VirtualHolding.stock_symbol == symbol,
            )
        )
        holding = h_result.scalar_one_or_none()

        if not holding or holding.quantity < quantity:
            held = holding.quantity if holding else 0
            return {
                "success": False,
                "error": f"Not enough shares. You hold {held}, trying to sell {quantity}.",
            }

        sell_value   = Decimal(str(round(price * quantity, 2)))
        cost_basis   = holding.average_price * Decimal(str(quantity))
        realized_pnl = sell_value - cost_basis

        # Update holding
        if holding.quantity == quantity:
            await session.delete(holding)
        else:
            holding.quantity -= quantity

        # Record transaction
        txn = VirtualTransaction(
            user_id=user_id,
            account_id=account.id,
            stock_symbol=symbol,
            company_name=holding.company_name or symbol.replace(".NS", ""),
            transaction_type="SELL",
            quantity=quantity,
            price=Decimal(str(price)),
            total_value=sell_value,
            realized_pnl=realized_pnl,
        )
        session.add(txn)

        # Update account
        account.cash_balance    += sell_value
        account.invested_amount  = max(Decimal("0"), account.invested_amount - cost_basis)
        account.realized_pnl    += realized_pnl

        await session.commit()
        await _update_leaderboard(user_id, account, session)

        return {
            "success": True,
            "symbol": symbol,
            "quantity": quantity,
            "price": round(price, 2),
            "sale_value": float(sell_value),
            "realized_pnl": float(realized_pnl),
            "realized_pnl_pct": float((realized_pnl / cost_basis) * 100) if cost_basis else 0,
            "cash_balance": float(account.cash_balance),
            "message": (
                f"Sold {quantity} shares of {symbol} at ₹{price:,.2f}. "
                f"P&L: ₹{float(realized_pnl):+,.2f}"
            ),
        }


# ═══════════════════════════════════════════════════════════════════════════════
# Portfolio valuation
# ═══════════════════════════════════════════════════════════════════════════════

async def get_portfolio(user_id: str) -> dict:
    """
    Return full portfolio: account summary + enriched holdings with live prices.
    """
    async with async_session_factory() as session:
        account = await get_or_create_account(user_id, session)

        h_result = await session.execute(
            select(VirtualHolding).where(VirtualHolding.account_id == account.id)
        )
        holdings = h_result.scalars().all()

    if not holdings:
        total_portfolio_value = float(account.cash_balance)
        _update_portfolio_value(account, total_portfolio_value)
        return _build_portfolio_response(account, [], total_portfolio_value)

    # Fetch live prices for all holdings in one batch call
    symbols = [h.stock_symbol for h in holdings]
    try:
        from app.services.stock_fetcher import fetch_batch_quotes
        price_data = await fetch_batch_quotes(symbols)
        price_map = {item["symbol"]: item.get("price") or item.get("close", 0)
                     for item in price_data}
    except Exception:
        price_map = {}

    enriched = []
    total_market_value = Decimal("0")

    for h in holdings:
        current_price = price_map.get(h.stock_symbol, 0) or 0
        market_value  = Decimal(str(current_price)) * Decimal(str(h.quantity))
        unreal_pnl    = market_value - (h.average_price * Decimal(str(h.quantity)))
        unreal_pnl_pct = (
            (float(unreal_pnl) / float(h.average_price * Decimal(str(h.quantity)))) * 100
            if h.average_price and h.quantity else 0
        )
        total_market_value += market_value

        enriched.append({
            "symbol":        h.stock_symbol,
            "company_name":  h.company_name or h.stock_symbol.replace(".NS", ""),
            "quantity":      h.quantity,
            "avg_buy_price": float(h.average_price),
            "current_price": round(current_price, 2),
            "invested_value": float(h.average_price * Decimal(str(h.quantity))),
            "market_value":  round(float(market_value), 2),
            "unrealized_pnl": round(float(unreal_pnl), 2),
            "unrealized_pnl_pct": round(unreal_pnl_pct, 2),
        })

    total_portfolio_value = float(account.cash_balance) + float(total_market_value)

    # Persist updated portfolio_value
    async with async_session_factory() as session:
        await session.execute(
            update(VirtualAccount)
            .where(VirtualAccount.user_id == user_id)
            .values(portfolio_value=Decimal(str(round(total_portfolio_value, 2))))
        )
        await session.commit()

    return _build_portfolio_response(account, enriched, total_portfolio_value)


def _build_portfolio_response(account: VirtualAccount, holdings: list, total_value: float) -> dict:
    invested = sum(h["invested_value"] for h in holdings)
    unreal   = sum(h["unrealized_pnl"] for h in holdings)
    total_pnl = unreal + float(account.realized_pnl)
    return_pct = ((total_value - 100_000) / 100_000) * 100

    return {
        "cash_balance":       float(account.cash_balance),
        "invested_amount":    round(invested, 2),
        "portfolio_value":    round(total_value, 2),
        "realized_pnl":       float(account.realized_pnl),
        "unrealized_pnl":     round(unreal, 2),
        "total_pnl":          round(total_pnl, 2),
        "return_percentage":  round(return_pct, 2),
        "reset_date":         account.reset_date.isoformat(),
        "holdings":           holdings,
    }


def _update_portfolio_value(account: VirtualAccount, value: float):
    account.portfolio_value = Decimal(str(round(value, 2)))


# ═══════════════════════════════════════════════════════════════════════════════
# Leaderboard
# ═══════════════════════════════════════════════════════════════════════════════

async def _update_leaderboard(user_id: str, account: VirtualAccount, session: AsyncSession):
    """Upsert the current month's leaderboard row for this user."""
    try:
        today = date.today()
        result = await session.execute(
            select(MonthlyLeaderboard).where(
                MonthlyLeaderboard.user_id == user_id,
                MonthlyLeaderboard.month == today.month,
                MonthlyLeaderboard.year == today.year,
            )
        )
        lb = result.scalar_one_or_none()
        pv  = float(account.portfolio_value)
        ret = round(((pv - 100_000) / 100_000) * 100, 4)
        display = user_id.split("@")[0] if "@" in user_id else "Trader"

        if lb:
            lb.portfolio_value   = Decimal(str(pv))
            lb.return_percentage = Decimal(str(ret))
        else:
            lb = MonthlyLeaderboard(
                user_id=user_id,
                account_id=account.id,
                display_name=display,
                month=today.month,
                year=today.year,
                starting_balance=MONTHLY_ALLOWANCE,
                portfolio_value=Decimal(str(pv)),
                return_percentage=Decimal(str(ret)),
            )
            session.add(lb)
        await session.commit()
    except Exception as exc:
        logger.warning("Leaderboard update failed for %s: %s", user_id, exc)


async def get_leaderboard(user_id: str) -> dict:
    """Return top 10 + user's rank for the current month."""
    today = date.today()
    async with async_session_factory() as session:
        result = await session.execute(
            select(MonthlyLeaderboard)
            .where(
                MonthlyLeaderboard.month == today.month,
                MonthlyLeaderboard.year  == today.year,
            )
            .order_by(MonthlyLeaderboard.return_percentage.desc())
        )
        all_entries = result.scalars().all()

    ranked = []
    user_entry = None
    for i, entry in enumerate(all_entries, start=1):
        row = {
            "rank":             i,
            "display_name":     entry.display_name or "Trader",
            "return_percentage": float(entry.return_percentage),
            "portfolio_value":   float(entry.portfolio_value),
            "is_current_user":   entry.user_id == user_id,
        }
        if entry.user_id == user_id:
            user_entry = {**row}
        ranked.append(row)

    return {
        "month":       today.month,
        "year":        today.year,
        "top10":       ranked[:10],
        "user_rank":   user_entry,
        "total_traders": len(ranked),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Achievements
# ═══════════════════════════════════════════════════════════════════════════════

async def get_achievements(user_id: str) -> list[dict]:
    """Compute badge unlocks from transaction/portfolio history."""
    async with async_session_factory() as session:
        txn_result = await session.execute(
            select(VirtualTransaction).where(VirtualTransaction.user_id == user_id)
        )
        txns = txn_result.scalars().all()

        acc_result = await session.execute(
            select(VirtualAccount).where(VirtualAccount.user_id == user_id)
        )
        account = acc_result.scalar_one_or_none()

    if not account:
        return []

    buy_count  = sum(1 for t in txns if t.transaction_type == "BUY")
    sell_count = sum(1 for t in txns if t.transaction_type == "SELL")
    winning_sells = sum(1 for t in txns if t.transaction_type == "SELL" and float(t.realized_pnl) > 0)
    return_pct = ((float(account.portfolio_value) - 100_000) / 100_000) * 100

    badges = [
        {
            "id": "first_trade",
            "title": "First Trade",
            "description": "Placed your first buy order",
            "icon": "🎯",
            "unlocked": buy_count >= 1,
        },
        {
            "id": "five_wins",
            "title": "5 Winning Trades",
            "description": "Closed 5 profitable positions",
            "icon": "🏆",
            "unlocked": winning_sells >= 5,
        },
        {
            "id": "ten_trades",
            "title": "Active Trader",
            "description": "Completed 10 buy orders",
            "icon": "⚡",
            "unlocked": buy_count >= 10,
        },
        {
            "id": "return_10",
            "title": "10% Club",
            "description": "Achieved 10%+ portfolio return",
            "icon": "📈",
            "unlocked": return_pct >= 10,
        },
        {
            "id": "return_25",
            "title": "25% Champion",
            "description": "Achieved 25%+ portfolio return",
            "icon": "🚀",
            "unlocked": return_pct >= 25,
        },
        {
            "id": "diversified",
            "title": "Diversified",
            "description": "Traded 5 or more different stocks",
            "icon": "🌐",
            "unlocked": len({t.stock_symbol for t in txns if t.transaction_type == "BUY"}) >= 5,
        },
    ]
    return badges


# ═══════════════════════════════════════════════════════════════════════════════
# AI Coach
# ═══════════════════════════════════════════════════════════════════════════════

async def get_ai_coach_insights(user_id: str) -> dict:
    """Generate AI portfolio coaching insights using OpenAI."""
    from app.config import get_settings
    settings = get_settings()

    portfolio = await get_portfolio(user_id)
    holdings  = portfolio.get("holdings", [])

    if not holdings:
        return {
            "insights": ["Add stocks to your portfolio to get AI coaching insights."],
            "risk_level": "low",
            "summary": "No holdings yet.",
        }

    # Build a simple text summary for the AI
    holdings_text = "\n".join(
        f"- {h['company_name']} ({h['symbol']}): {h['quantity']} shares, "
        f"avg ₹{h['avg_buy_price']:,.2f}, current ₹{h['current_price']:,.2f}, "
        f"P&L: ₹{h['unrealized_pnl']:+,.2f} ({h['unrealized_pnl_pct']:+.1f}%)"
        for h in holdings
    )

    prompt = f"""You are an AI trading coach for a paper trading simulator.
Analyze this portfolio and give 3-5 actionable insights in simple language.
Focus on: diversification, risk concentration, sector exposure, performance.

Portfolio:
- Cash: ₹{portfolio['cash_balance']:,.2f}
- Portfolio Value: ₹{portfolio['portfolio_value']:,.2f}
- Return: {portfolio['return_percentage']:+.2f}%
- Realized P&L: ₹{portfolio['realized_pnl']:+,.2f}

Holdings:
{holdings_text}

Respond with JSON: {{"insights": ["...", "..."], "risk_level": "low|medium|high", "summary": "one sentence"}}"""

    if not settings.OPENAI_API_KEY and not settings.GROQ_API_KEY:
        return {
            "insights": [
                f"You hold {len(holdings)} stock(s). Consider diversifying across sectors.",
                f"Your portfolio is {'up' if portfolio['return_percentage'] >= 0 else 'down'} "
                f"{abs(portfolio['return_percentage']):.1f}% this month.",
                "Set a stop-loss strategy to protect gains.",
            ],
            "risk_level": "medium",
            "summary": "AI coach unavailable — configure OpenAI or Groq API key.",
        }

    try:
        import json
        from app.services.ai_provider import get_ai_response
        raw = await get_ai_response(prompt, max_tokens=400)
        # Try to parse JSON from AI response
        start = raw.find("{")
        end   = raw.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(raw[start:end])
    except Exception as exc:
        logger.warning("AI coach generation failed: %s", exc)

    return {
        "insights": ["Could not generate AI insights. Try again shortly."],
        "risk_level": "unknown",
        "summary": "",
    }
