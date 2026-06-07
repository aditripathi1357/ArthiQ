"""
Notifications Router
====================
REST API for the personalized notification system.

Endpoints:
  GET  /api/notifications/profile              - Get user notification settings
  POST /api/notifications/profile              - Upsert notification settings
  GET  /api/notifications/research-list        - Get user's research list
  POST /api/notifications/research-list        - Add stock to research list
  DELETE /api/notifications/research-list/{symbol} - Remove stock
  GET  /api/notifications/reports/{symbol}     - Get AI research report
  POST /api/notifications/reports/{symbol}/generate - Force regenerate report
  GET  /api/notifications/logs                 - Get notification history

Auth: All endpoints require X-User-Id header (Supabase user UUID).
The frontend sends this from supabase.auth.getUser().
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Query
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy import select, delete

from app.database import async_session_factory
from app.models.user_notification import UserNotification
from app.models.research_item import ResearchItem
from app.models.ai_research_report import AIResearchReport
from app.models.notification_log import NotificationEntry
from app.services.research_engine import generate_research_report, persist_report_to_db, get_report_from_db
from app.utils.company_data import get_company_name

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


# ═══════════════════════════════════════════════════════════════════════════════
# Pydantic schemas
# ═══════════════════════════════════════════════════════════════════════════════

class NotificationPreferences(BaseModel):
    market_news: bool = True
    company_news: bool = True
    earnings_updates: bool = True
    dividend_updates: bool = True
    price_alerts: bool = False
    ai_research_reports: bool = True
    corporate_actions: bool = True


class NotificationProfileIn(BaseModel):
    email: str
    whatsapp_number: str | None = None
    notification_preferences: NotificationPreferences = NotificationPreferences()
    email_enabled: bool = True
    whatsapp_enabled: bool = False


class AddToResearchListIn(BaseModel):
    symbol: str
    company_name: str | None = None

    @field_validator("symbol")
    @classmethod
    def normalize_symbol(cls, v: str) -> str:
        return v.strip().upper()


# ═══════════════════════════════════════════════════════════════════════════════
# Auth helper
# ═══════════════════════════════════════════════════════════════════════════════

def _require_user_id(x_user_id: str | None) -> str:
    """Extract and validate user ID from header."""
    if not x_user_id or not x_user_id.strip():
        raise HTTPException(status_code=401, detail="X-User-Id header required. Please log in.")
    return x_user_id.strip()


async def _get_or_create_user(supabase_user_id: str, email: str | None = None) -> UserNotification:
    """Get or create a UserNotification record by Supabase user ID."""
    async with async_session_factory() as session:
        result = await session.execute(
            select(UserNotification).where(UserNotification.supabase_user_id == supabase_user_id)
        )
        user = result.scalar_one_or_none()

        if not user:
            # Create a placeholder record
            user = UserNotification(
                email=email or f"user_{supabase_user_id[:8]}@arthiq.placeholder",
                supabase_user_id=supabase_user_id,
                notification_preferences={
                    "market_news": True,
                    "company_news": True,
                    "earnings_updates": True,
                    "dividend_updates": True,
                    "price_alerts": False,
                    "ai_research_reports": True,
                    "corporate_actions": True,
                },
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)

        return user


# ═══════════════════════════════════════════════════════════════════════════════
# Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/profile")
async def get_notification_profile(
    x_user_id: str | None = Header(default=None),
):
    """Get the authenticated user's notification settings."""
    uid = _require_user_id(x_user_id)

    try:
        async with async_session_factory() as session:
            result = await session.execute(
                select(UserNotification).where(UserNotification.supabase_user_id == uid)
            )
            user = result.scalar_one_or_none()

        if not user:
            # Return defaults if not yet configured
            return {
                "configured": False,
                "email": None,
                "whatsapp_number": None,
                "email_enabled": True,
                "whatsapp_enabled": False,
                "notification_preferences": {
                    "market_news": True,
                    "company_news": True,
                    "earnings_updates": True,
                    "dividend_updates": True,
                    "price_alerts": False,
                    "ai_research_reports": True,
                    "corporate_actions": True,
                },
            }

        return {
            "configured": True,
            "email": user.email,
            "whatsapp_number": user.whatsapp_number,
            "email_enabled": user.email_enabled,
            "whatsapp_enabled": user.whatsapp_enabled,
            "notification_preferences": user.notification_preferences or {},
            "created_at": user.created_at.isoformat() if user.created_at else None,
        }
    except Exception as exc:
        logger.error("Failed to get notification profile for %s: %s", uid, exc)
        raise HTTPException(status_code=500, detail="Could not load notification settings.")


@router.post("/profile")
async def upsert_notification_profile(
    body: NotificationProfileIn,
    x_user_id: str | None = Header(default=None),
):
    """Create or update notification settings for the authenticated user."""
    uid = _require_user_id(x_user_id)

    try:
        async with async_session_factory() as session:
            result = await session.execute(
                select(UserNotification).where(UserNotification.supabase_user_id == uid)
            )
            user = result.scalar_one_or_none()

            prefs = body.notification_preferences.model_dump()

            if user:
                user.email = body.email
                user.whatsapp_number = body.whatsapp_number
                user.notification_preferences = prefs
                user.email_enabled = body.email_enabled
                user.whatsapp_enabled = body.whatsapp_enabled
            else:
                user = UserNotification(
                    email=body.email,
                    whatsapp_number=body.whatsapp_number,
                    notification_preferences=prefs,
                    email_enabled=body.email_enabled,
                    whatsapp_enabled=body.whatsapp_enabled,
                    supabase_user_id=uid,
                )
                session.add(user)

            await session.commit()
            await session.refresh(user)

        return {
            "success": True,
            "message": "Notification preferences saved successfully.",
            "email": user.email,
            "whatsapp_enabled": user.whatsapp_enabled,
        }
    except Exception as exc:
        logger.error("Failed to save notification profile for %s: %s", uid, exc)
        raise HTTPException(status_code=500, detail="Could not save notification settings.")


@router.get("/research-list")
async def get_research_list(
    x_user_id: str | None = Header(default=None),
):
    """Get all stocks in the user's research list."""
    uid = _require_user_id(x_user_id)

    try:
        async with async_session_factory() as session:
            # Get user
            result = await session.execute(
                select(UserNotification).where(UserNotification.supabase_user_id == uid)
            )
            user = result.scalar_one_or_none()

            if not user:
                return {"research_list": [], "total": 0}

            # Get research items
            result = await session.execute(
                select(ResearchItem).where(ResearchItem.user_id == user.id)
                .order_by(ResearchItem.created_at.desc())
            )
            items = result.scalars().all()

        return {
            "research_list": [
                {
                    "id": str(item.id),
                    "symbol": item.stock_symbol,
                    "company_name": item.company_name or get_company_name(item.stock_symbol),
                    "added_at": item.created_at.isoformat() if item.created_at else None,
                    "last_analyzed_at": item.last_analyzed_at.isoformat() if item.last_analyzed_at else None,
                }
                for item in items
            ],
            "total": len(items),
        }
    except Exception as exc:
        logger.error("Failed to get research list for %s: %s", uid, exc)
        raise HTTPException(status_code=500, detail="Could not load research list.")


@router.post("/research-list")
async def add_to_research_list(
    body: AddToResearchListIn,
    background_tasks: BackgroundTasks,
    x_user_id: str | None = Header(default=None),
):
    """Add a stock to the research list. Triggers an immediate AI report generation."""
    uid = _require_user_id(x_user_id)
    from app.services.stock_fetcher import resolve_stock_symbol
    body.symbol = await resolve_stock_symbol(body.symbol)

    try:
        async with async_session_factory() as session:
            # Get or create user profile
            result = await session.execute(
                select(UserNotification).where(UserNotification.supabase_user_id == uid)
            )
            user = result.scalar_one_or_none()

            if not user:
                user = UserNotification(
                    email=f"user_{uid[:8]}@arthiq.placeholder",
                    supabase_user_id=uid,
                    notification_preferences={
                        "market_news": True, "company_news": True,
                        "earnings_updates": True, "dividend_updates": True,
                        "price_alerts": False, "ai_research_reports": True,
                        "corporate_actions": True,
                    },
                )
                session.add(user)
                await session.flush()

            # Check if already exists
            result = await session.execute(
                select(ResearchItem).where(
                    ResearchItem.user_id == user.id,
                    ResearchItem.stock_symbol == body.symbol,
                )
            )
            existing = result.scalars().first()
            if existing:
                return {
                    "success": True,
                    "message": f"{body.symbol} is already in your research list.",
                    "already_exists": True,
                }

            # Add new item
            company_name = body.company_name or get_company_name(body.symbol)
            item = ResearchItem(
                user_id=user.id,
                stock_symbol=body.symbol,
                company_name=company_name,
            )
            session.add(item)
            await session.commit()

        # Kick off AI report generation in background
        background_tasks.add_task(_generate_and_persist_report, body.symbol)

        logger.info("Added %s to research list for user %s", body.symbol, uid)
        return {
            "success": True,
            "message": f"{company_name} added to your research list. AI report generating...",
            "symbol": body.symbol,
            "company_name": company_name,
            "report_generating": True,
        }
    except Exception as exc:
        logger.error("Failed to add %s to research list: %s", body.symbol, exc)
        raise HTTPException(status_code=500, detail="Could not add to research list.")


@router.delete("/research-list/{symbol}")
async def remove_from_research_list(
    symbol: str,
    x_user_id: str | None = Header(default=None),
):
    """Remove a stock from the research list."""
    uid = _require_user_id(x_user_id)
    from app.services.stock_fetcher import resolve_stock_symbol
    symbol = await resolve_stock_symbol(symbol)

    try:
        async with async_session_factory() as session:
            result = await session.execute(
                select(UserNotification).where(UserNotification.supabase_user_id == uid)
            )
            user = result.scalar_one_or_none()

            if not user:
                raise HTTPException(status_code=404, detail="User profile not found.")

            await session.execute(
                delete(ResearchItem).where(
                    ResearchItem.user_id == user.id,
                    ResearchItem.stock_symbol == symbol,
                )
            )
            await session.commit()

        return {"success": True, "message": f"{symbol} removed from research list."}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to remove %s from research list: %s", symbol, exc)
        raise HTTPException(status_code=500, detail="Could not remove from research list.")


@router.get("/reports/{symbol}")
async def get_research_report(
    symbol: str,
    x_user_id: str | None = Header(default=None),
):
    """
    Get the latest AI research report for a symbol.
    First checks DB cache, then generates fresh if missing.
    """
    _require_user_id(x_user_id)
    from app.services.stock_fetcher import resolve_stock_symbol
    symbol = await resolve_stock_symbol(symbol)

    # Try DB first
    db_report = await get_report_from_db(symbol)
    if db_report:
        return db_report

    # Generate fresh (synchronously, this endpoint waits)
    try:
        report = await generate_research_report(symbol)
        await persist_report_to_db(symbol, report)
        return report
    except Exception as exc:
        logger.error("Report generation failed for %s: %s", symbol, exc)
        raise HTTPException(status_code=500, detail=f"Could not generate report for {symbol}.")


@router.post("/reports/{symbol}/generate")
async def force_generate_report(
    symbol: str,
    background_tasks: BackgroundTasks,
    x_user_id: str | None = Header(default=None),
):
    """Force regenerate the AI research report for a symbol."""
    _require_user_id(x_user_id)
    from app.services.stock_fetcher import resolve_stock_symbol
    symbol = await resolve_stock_symbol(symbol)

    background_tasks.add_task(_generate_and_persist_report, symbol, force=True)
    return {
        "success": True,
        "message": f"AI report generation triggered for {symbol}. Check back in 30 seconds.",
        "symbol": symbol,
    }


@router.get("/logs")
async def get_notification_logs(
    limit: int = Query(default=20, le=100),
    x_user_id: str | None = Header(default=None),
):
    """Get notification delivery history for the authenticated user."""
    uid = _require_user_id(x_user_id)

    try:
        async with async_session_factory() as session:
            result = await session.execute(
                select(UserNotification).where(UserNotification.supabase_user_id == uid)
            )
            user = result.scalar_one_or_none()

            if not user:
                return {"logs": [], "total": 0}

            result = await session.execute(
                select(NotificationEntry)
                .where(NotificationEntry.user_id == user.id)
                .order_by(NotificationEntry.created_at.desc())
                .limit(limit)
            )
            logs = result.scalars().all()

        return {
            "logs": [
                {
                    "id": str(log.id),
                    "type": log.type,
                    "channel": log.channel,
                    "symbol": log.symbol,
                    "title": log.title,
                    "status": log.status,
                    "sent_at": log.created_at.isoformat() if log.created_at else None,
                }
                for log in logs
            ],
            "total": len(logs),
        }
    except Exception as exc:
        logger.error("Failed to get notification logs for %s: %s", uid, exc)
        raise HTTPException(status_code=500, detail="Could not load notification logs.")


@router.get("/reports")
async def get_all_reports_for_user(
    x_user_id: str | None = Header(default=None),
):
    """Get AI reports for all stocks in the user's research list."""
    uid = _require_user_id(x_user_id)

    try:
        async with async_session_factory() as session:
            result = await session.execute(
                select(UserNotification).where(UserNotification.supabase_user_id == uid)
            )
            user = result.scalar_one_or_none()

            if not user:
                return {"reports": []}

            result = await session.execute(
                select(ResearchItem).where(ResearchItem.user_id == user.id)
            )
            items = result.scalars().all()

        reports = []
        for item in items:
            db_report = await get_report_from_db(item.stock_symbol)
            if db_report:
                reports.append(db_report)
            else:
                # Return a placeholder
                reports.append({
                    "symbol": item.stock_symbol,
                    "company_name": item.company_name or item.stock_symbol,
                    "summary": "AI report is being generated. Please check back shortly.",
                    "sentiment": "neutral",
                    "impact_level": "neutral",
                    "short_term_outlook": "",
                    "confidence_score": 0.0,
                    "generated_at": None,
                    "pending": True,
                })

        return {"reports": reports}
    except Exception as exc:
        logger.error("Failed to get all reports for %s: %s", uid, exc)
        raise HTTPException(status_code=500, detail="Could not load research reports.")


# ═══════════════════════════════════════════════════════════════════════════════
# Background task
# ═══════════════════════════════════════════════════════════════════════════════

async def _generate_and_persist_report(symbol: str, force: bool = False) -> None:
    """Background task: generate AI report, persist to DB, then notify users."""
    try:
        logger.info("Background: generating research report for %s", symbol)
        report = await generate_research_report(symbol, force=force)
        ok = await persist_report_to_db(symbol, report)
        if ok:
            logger.info("Background: research report persisted for %s", symbol)

            # Update last_analyzed_at on research items for this symbol
            from sqlalchemy import update
            async with async_session_factory() as session:
                await session.execute(
                    update(ResearchItem)
                    .where(ResearchItem.stock_symbol == symbol)
                    .values(last_analyzed_at=datetime.now(timezone.utc))
                )
                await session.commit()

            # Notify all users who track this symbol
            from app.services.notification_dispatcher import dispatch_new_report_to_user
            await dispatch_new_report_to_user(symbol, report)

    except Exception as exc:
        logger.error("Background report generation failed for %s: %s", symbol, exc)
