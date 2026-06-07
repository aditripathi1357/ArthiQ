"""
Notification Dispatcher
=======================
Orchestrates notification delivery across email + WhatsApp.

Checks user preferences before sending. Logs all attempts to DB.
Called by:
  - API endpoint (immediate on new research item)
  - Scheduler (periodic digest + report refresh)
"""

import logging
import uuid
from datetime import datetime, timezone

from app.services.email_service import (
    send_research_report_email,
    send_daily_digest_email,
    send_breaking_news_email,
    send_earnings_alert_email,
    send_dividend_alert_email,
)
from app.services.whatsapp_service import (
    send_research_summary_whatsapp,
    send_daily_digest_whatsapp,
    send_breaking_news_whatsapp,
    send_earnings_alert_whatsapp,
    send_dividend_alert_whatsapp,
)

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# Log to DB helper
# ═══════════════════════════════════════════════════════════════════════════════

async def _log_notification(
    user_db_id: uuid.UUID,
    notif_type: str,
    channel: str,
    symbol: str | None,
    title: str,
    status: str,
) -> None:
    """Persist a notification log entry."""
    try:
        from app.database import async_session_factory
        from app.models.notification_log import NotificationEntry

        async with async_session_factory() as session:
            entry = NotificationEntry(
                user_id=user_db_id,
                type=notif_type,
                channel=channel,
                symbol=symbol,
                title=title[:255],
                message="",
                status=status,
            )
            session.add(entry)
            await session.commit()
    except Exception as exc:
        logger.warning("Could not log notification to DB: %s", exc)


# ═══════════════════════════════════════════════════════════════════════════════
# Main dispatcher
# ═══════════════════════════════════════════════════════════════════════════════

async def dispatch_research_report(
    user_email: str,
    user_whatsapp: str | None,
    user_db_id: uuid.UUID | None,
    user_prefs: dict,
    report: dict,
    email_enabled: bool = True,
    whatsapp_enabled: bool = False,
) -> dict:
    """
    Send a research report via configured channels.

    Returns:
        {"email": bool, "whatsapp": bool}
    """
    symbol = report.get("symbol", "")
    company = report.get("company_name", symbol)
    results = {"email": False, "whatsapp": False}

    if not user_prefs.get("ai_research_reports", True):
        logger.info("User opted out of AI research reports — skipping %s", symbol)
        return results

    # Email
    if email_enabled and user_email:
        ok = send_research_report_email(user_email, report)
        results["email"] = ok
        if user_db_id:
            await _log_notification(
                user_db_id, "research_report", "email", symbol,
                f"Research Report: {company}", "sent" if ok else "failed"
            )

    # WhatsApp
    if whatsapp_enabled and user_whatsapp:
        ok = send_research_summary_whatsapp(user_whatsapp, report)
        results["whatsapp"] = ok
        if user_db_id:
            await _log_notification(
                user_db_id, "research_report", "whatsapp", symbol,
                f"WhatsApp Research: {company}", "sent" if ok else "failed"
            )

    return results


async def dispatch_daily_digest_to_all() -> int:
    """
    Send daily digest emails to all users who have research lists.
    Called by the scheduler at 8:00 AM IST.
    Returns count of emails sent.
    """
    from sqlalchemy import select, join
    from app.database import async_session_factory
    from app.models.user_notification import UserNotification
    from app.models.research_item import ResearchItem
    from app.services.research_engine import generate_research_report

    sent_count = 0

    try:
        async with async_session_factory() as session:
            # Get all users who have at least one research item via a proper JOIN
            result = await session.execute(
                select(UserNotification)
                .join(ResearchItem, ResearchItem.user_id == UserNotification.id)
                .distinct()
            )
            users = result.scalars().all()

        for user in users:
            if not user.email_enabled or not user.email:
                continue
            if not user.get_pref("ai_research_reports", True):
                continue

            # Fetch research list
            async with async_session_factory() as session:
                result = await session.execute(
                    select(ResearchItem).where(ResearchItem.user_id == user.id)
                )
                items = result.scalars().all()

            if not items:
                continue

            # Generate/fetch reports for each symbol
            reports = []
            for item in items:
                try:
                    report = await generate_research_report(item.stock_symbol)
                    reports.append(report)
                except Exception as exc:
                    logger.warning("Report failed for %s: %s", item.stock_symbol, exc)

            if not reports:
                continue

            user_name = user.email.split("@")[0].title()
            ok = send_daily_digest_email(user.email, reports, user_name)

            if ok:
                sent_count += 1
                await _log_notification(
                    user.id, "daily_digest", "email", None,
                    f"Daily Digest ({len(reports)} stocks)", "sent"
                )

            # WhatsApp digest
            if user.whatsapp_enabled and user.whatsapp_number and reports:
                send_daily_digest_whatsapp(user.whatsapp_number, reports)

    except Exception as exc:
        logger.error("Daily digest dispatch failed: %s", exc)

    logger.info("Daily digest sent to %d users", sent_count)
    return sent_count

async def dispatch_new_report_to_user(
    symbol: str,
    report: dict,
) -> None:
    """
    After a fresh AI report is generated, notify all users tracking that symbol.
    Called automatically by the background report generation task.
    """
    from sqlalchemy import select
    from app.database import async_session_factory
    from app.models.user_notification import UserNotification
    from app.models.research_item import ResearchItem

    try:
        async with async_session_factory() as session:
            result = await session.execute(
                select(UserNotification)
                .join(ResearchItem, ResearchItem.user_id == UserNotification.id)
                .where(ResearchItem.stock_symbol == symbol)
                .distinct()
            )
            users = result.scalars().all()

        for user in users:
            await dispatch_research_report(
                user_email=user.email,
                user_whatsapp=user.whatsapp_number,
                user_db_id=user.id,
                user_prefs=user.notification_preferences or {},
                report=report,
                email_enabled=user.email_enabled,
                whatsapp_enabled=user.whatsapp_enabled,
            )
    except Exception as exc:
        logger.error("dispatch_new_report_to_user failed for %s: %s", symbol, exc)



async def dispatch_breaking_news(
    symbol: str,
    company_name: str,
    headline: str,
    sentiment: str = "neutral",
) -> int:
    """
    Send breaking news to all users who track this symbol.
    Returns count of notifications sent.
    """
    from sqlalchemy import select
    from app.database import async_session_factory
    from app.models.user_notification import UserNotification
    from app.models.research_item import ResearchItem

    sent_count = 0
    try:
        async with async_session_factory() as session:
            # Proper JOIN — find users who track this specific symbol
            result = await session.execute(
                select(UserNotification)
                .join(ResearchItem, ResearchItem.user_id == UserNotification.id)
                .where(ResearchItem.stock_symbol == symbol)
                .distinct()
            )
            users = result.scalars().all()

        for user in users:
            if not user.get_pref("company_news", True):
                continue

            if user.email_enabled and user.email:
                ok = send_breaking_news_email(user.email, symbol, company_name, headline, sentiment)
                if ok:
                    sent_count += 1
                    await _log_notification(
                        user.id, "breaking_news", "email", symbol,
                        f"Breaking News: {company_name}", "sent" if ok else "failed"
                    )

            if user.whatsapp_enabled and user.whatsapp_number:
                send_breaking_news_whatsapp(user.whatsapp_number, symbol, company_name, headline)

    except Exception as exc:
        logger.error("Breaking news dispatch failed for %s: %s", symbol, exc)

    return sent_count
