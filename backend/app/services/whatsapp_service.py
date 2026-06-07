"""
WhatsApp Service
================
Sends WhatsApp messages via Twilio WhatsApp Sandbox.

Setup:
  1. Go to https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
  2. Join the sandbox by sending "join <code>" to +1 415 523 8886
  3. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM in .env

Message types:
  - research_summary: Compact research report
  - daily_digest: Morning market digest
  - breaking_news: Urgent company news
  - earnings_alert: Upcoming earnings reminder
  - dividend_alert: Dividend declaration
"""

import logging

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()
_BASE = settings.FRONTEND_URL  # e.g. https://arthiq.com or http://localhost:5173


def _send_whatsapp(to_number: str, message: str) -> bool:
    """
    Send a WhatsApp message via Twilio.
    Falls back gracefully if Twilio is not configured.
    """
    twilio_sid = getattr(settings, "TWILIO_ACCOUNT_SID", "") or ""
    twilio_token = getattr(settings, "TWILIO_AUTH_TOKEN", "") or ""
    twilio_from = getattr(settings, "TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886") or "whatsapp:+14155238886"

    if not twilio_sid or not twilio_token:
        logger.warning(
            "Twilio not configured (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN missing). "
            "Would send WhatsApp to %s: %.80s...", to_number, message
        )
        return False

    # Normalize number to WhatsApp format
    if not to_number.startswith("whatsapp:"):
        clean = to_number.strip().replace(" ", "").replace("-", "")
        if not clean.startswith("+"):
            clean = "+91" + clean  # Default to India country code
        to_number_wa = f"whatsapp:{clean}"
    else:
        to_number_wa = to_number

    try:
        from twilio.rest import Client  # type: ignore[import]
        client = Client(twilio_sid, twilio_token)
        msg = client.messages.create(
            body=message,
            from_=twilio_from,
            to=to_number_wa,
        )
        logger.info("WhatsApp sent to %s SID=%s", to_number, msg.sid)
        return True
    except ImportError:
        logger.error(
            "twilio package not installed. Run: pip install twilio. "
            "WhatsApp message NOT sent to %s", to_number
        )
        return False
    except Exception as exc:
        logger.error("WhatsApp send failed to %s: %s", to_number, exc)
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# Message Formatters
# ═══════════════════════════════════════════════════════════════════════════════

def _emoji_sentiment(sentiment: str) -> str:
    return {"positive": "📈", "negative": "📉", "neutral": "➡️"}.get(sentiment, "➡️")


def _emoji_impact(impact: str) -> str:
    return {"bullish": "🟢", "bearish": "🔴", "neutral": "🟡"}.get(impact, "🟡")


def send_research_summary_whatsapp(to_number: str, report: dict) -> bool:
    """Send a compact research report via WhatsApp."""
    symbol = report.get("symbol", "")
    company = report.get("company_name", symbol)
    sentiment = report.get("sentiment", "neutral")
    impact = report.get("impact_level", "neutral")
    confidence = int(report.get("confidence_score", 0.65) * 100)
    summary = (report.get("summary") or "")[:200]
    outlook = (report.get("short_term_outlook") or "")[:150]
    sup = report.get("supporting_data", {})
    price = sup.get("price", 0)
    change_pct = sup.get("change_pct", 0)
    change_arrow = "▲" if change_pct > 0 else "▼" if change_pct < 0 else "▶"

    message = (
        f"🔬 *ArthiQ Research Alert*\n"
        f"{'─' * 30}\n\n"
        f"*{company}* ({symbol.replace('.NS', '')})\n\n"
        f"{_emoji_sentiment(sentiment)} Sentiment: *{sentiment.title()}*\n"
        f"{_emoji_impact(impact)} Impact: *{impact.title()}*\n"
        f"💰 Price: ₹{price:,.2f} ({change_arrow}{abs(change_pct):.1f}%)\n"
        f"🎯 Confidence: {confidence}%\n\n"
        f"📋 *Summary:*\n{summary}\n\n"
        f"🔭 *Outlook:*\n{outlook}\n\n"
        f"View full report: {_BASE}/company/{symbol}/ai-insights"
    )
    return _send_whatsapp(to_number, message)


def send_daily_digest_whatsapp(to_number: str, reports: list[dict]) -> bool:
    """Send morning digest with all research list stocks."""
    from datetime import datetime
    date_str = datetime.now().strftime("%d %b %Y")

    lines = [
        f"☀️ *ArthiQ Morning Digest* — {date_str}",
        f"{'─' * 30}",
        f"Your {len(reports)} research stocks:\n",
    ]

    for r in reports[:6]:
        symbol = r.get("symbol", "")
        name = r.get("company_name", symbol)
        sentiment = r.get("sentiment", "neutral")
        impact = r.get("impact_level", "neutral")
        sup = r.get("supporting_data", {})
        change_pct = sup.get("change_pct", 0)
        change_arrow = "▲" if change_pct > 0 else "▼" if change_pct < 0 else "▶"
        emoji = _emoji_sentiment(sentiment)

        lines.append(
            f"{emoji} *{name}* ({symbol.replace('.NS', '')})\n"
            f"   {change_arrow} {abs(change_pct):.1f}% | {sentiment.title()} | {impact.title()}"
        )

    lines.append(f"\n📱 Full dashboard: {_BASE}/notifications")
    message = "\n".join(lines)
    return _send_whatsapp(to_number, message)


def send_breaking_news_whatsapp(to_number: str, symbol: str, company_name: str, headline: str) -> bool:
    """Send urgent breaking news alert."""
    message = (
        f"🔔 *Breaking News Alert*\n"
        f"{'─' * 30}\n\n"
        f"*{company_name}* ({symbol.replace('.NS', '')})\n\n"
        f"📰 {headline}\n\n"
        f"This may impact the stock price significantly.\n\n"
        f"View analysis: {_BASE}/company/{symbol}/ai-insights"
    )
    return _send_whatsapp(to_number, message)


def send_earnings_alert_whatsapp(to_number: str, symbol: str, company_name: str, date: str) -> bool:
    """Send earnings announcement reminder."""
    message = (
        f"📅 *Earnings Alert*\n"
        f"{'─' * 30}\n\n"
        f"*{company_name}* ({symbol.replace('.NS', '')})\n\n"
        f"🗓️ Earnings Date: *{date}*\n\n"
        f"Watch for significant price movement around this date.\n\n"
        f"View company: {_BASE}/company/{symbol}"
    )
    return _send_whatsapp(to_number, message)


def send_dividend_alert_whatsapp(to_number: str, symbol: str, company_name: str,
                                  amount: str, ex_date: str) -> bool:
    """Send dividend declaration alert."""
    message = (
        f"💰 *Dividend Declared*\n"
        f"{'─' * 30}\n\n"
        f"*{company_name}* ({symbol.replace('.NS', '')})\n\n"
        f"💵 Amount: ₹{amount} per share\n"
        f"📅 Ex-Date: *{ex_date}*\n\n"
        f"Hold shares before ex-date to be eligible for dividend.\n\n"
        f"View company: {_BASE}/company/{symbol}"
    )
    return _send_whatsapp(to_number, message)
