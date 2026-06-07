"""
AI Research Engine
==================
Generates structured AI research reports for stocks.

For each symbol it:
  1. Fetches recent news (news_fetcher)
  2. Fetches price + company info (stock_fetcher)
  3. Fetches earnings / dividend data (yfinance calendar)
  4. Calls Groq → OpenAI to produce a structured JSON report
  5. Persists the report to `ai_research_reports` table
  6. Returns the structured result

Report schema:
  {
    "symbol":           str,
    "company_name":     str,
    "summary":          str,
    "sentiment":        "positive" | "neutral" | "negative",
    "impact_level":     "bullish" | "neutral" | "bearish",
    "short_term_outlook": str,
    "confidence_score": float (0.0-1.0),
    "key_events":       list[str],
    "analyst_view":     str,
    "generated_at":     ISO datetime str,
  }
"""

import json
import logging
import time
from datetime import datetime, timezone

from app.services.ai_provider import get_ai_response
from app.services.news_fetcher import fetch_company_news
from app.services.stock_fetcher import fetch_stock_quote, fetch_company_info, fetch_stock_history
from app.utils.company_data import get_company_name

logger = logging.getLogger(__name__)

# In-memory cache: symbol → {report, ts}
_report_cache: dict[str, dict] = {}
REPORT_TTL = 6 * 60 * 60  # 6 hours


def _cache_get(symbol: str) -> dict | None:
    entry = _report_cache.get(symbol)
    if not entry:
        return None
    if time.time() - entry["ts"] > REPORT_TTL:
        del _report_cache[symbol]
        return None
    return entry["data"]


def _cache_set(symbol: str, data: dict) -> None:
    _report_cache[symbol] = {"data": data, "ts": time.time()}
    # Evict if too large
    if len(_report_cache) > 200:
        oldest = sorted(_report_cache.items(), key=lambda x: x[1]["ts"])
        for k, _ in oldest[:20]:
            del _report_cache[k]


def _parse_json_safe(text: str) -> dict | None:
    """Extract JSON from AI response, handle markdown fences."""
    if not text:
        return None
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines = [l for l in cleaned.split("\n") if not l.strip().startswith("```")]
        cleaned = "\n".join(lines)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Try to find JSON block
        start = cleaned.find("{")
        end = cleaned.rfind("}") + 1
        if start >= 0 and end > start:
            try:
                return json.loads(cleaned[start:end])
            except json.JSONDecodeError:
                pass
    logger.warning("Could not parse JSON from AI response: %.200s", text)
    return None


async def _fetch_yfinance_calendar(symbol: str) -> dict:
    """Fetch earnings and dividend dates from yfinance (non-blocking wrapper)."""
    try:
        import asyncio
        import yfinance as yf

        def _sync_fetch():
            ticker = yf.Ticker(symbol)
            result = {}
            try:
                cal = ticker.calendar
                if cal is not None and not cal.empty:
                    result["earnings_date"] = str(cal.get("Earnings Date", [None])[0] if hasattr(cal.get("Earnings Date"), "__getitem__") else cal.get("Earnings Date"))
            except Exception:
                pass
            try:
                div = ticker.dividends
                if div is not None and not div.empty:
                    result["last_dividend"] = float(div.iloc[-1])
                    result["dividend_date"] = str(div.index[-1].date())
            except Exception:
                pass
            try:
                info = ticker.info or {}
                result["analyst_recommendation"] = info.get("recommendationKey", "")
                result["target_high_price"] = info.get("targetHighPrice")
                result["target_low_price"] = info.get("targetLowPrice")
                result["target_mean_price"] = info.get("targetMeanPrice")
                result["number_of_analyst_opinions"] = info.get("numberOfAnalystOpinions")
                result["forward_pe"] = info.get("forwardPE")
                result["trailing_pe"] = info.get("trailingPE")
                result["market_cap"] = info.get("marketCap")
                result["52_week_high"] = info.get("fiftyTwoWeekHigh")
                result["52_week_low"] = info.get("fiftyTwoWeekLow")
            except Exception:
                pass
            return result

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _sync_fetch)
    except Exception as exc:
        logger.warning("yfinance calendar fetch failed for %s: %s", symbol, exc)
        return {}


async def generate_research_report(symbol: str, force: bool = False) -> dict:
    """
    Full AI research report for a stock symbol.

    Args:
        symbol: Stock ticker (e.g. 'RELIANCE.NS')
        force:  Skip cache and regenerate

    Returns:
        Structured research report dict
    """
    if not force:
        cached = _cache_get(symbol)
        if cached:
            logger.info("Research report cache hit: %s", symbol)
            return cached

    now = datetime.now(timezone.utc)
    company_name = get_company_name(symbol)
    logger.info("Generating AI research report for %s (%s)", symbol, company_name)

    # ── 1. Fetch all data concurrently ────────────────────────────────────
    import asyncio
    news_task = asyncio.create_task(
        fetch_company_news(company_name, symbol, page_size=15)
    )
    quote_task = asyncio.create_task(fetch_stock_quote(symbol))
    info_task = asyncio.create_task(fetch_company_info(symbol))
    hist_task = asyncio.create_task(fetch_stock_history(symbol, period="1mo", interval="1d"))
    calendar_task = asyncio.create_task(_fetch_yfinance_calendar(symbol))

    news_articles, quote, company_info, history, calendar = await asyncio.gather(
        news_task, quote_task, info_task, hist_task, calendar_task,
        return_exceptions=True,
    )

    # Normalize exceptions to empty defaults
    if isinstance(news_articles, Exception): news_articles = []
    if isinstance(quote, Exception): quote = {}
    if isinstance(company_info, Exception): company_info = {}
    if isinstance(history, Exception): history = []
    if isinstance(calendar, Exception): calendar = {}

    # ── 2. Build context ──────────────────────────────────────────────────
    headlines = [a["headline"] for a in (news_articles or []) if a.get("headline")][:10]
    headline_block = "\n".join(f"• {h}" for h in headlines) if headlines else "• No recent news available"

    price = quote.get("price") or quote.get("close", 0) if quote else 0
    change_pct = quote.get("change_pct", 0) if quote else 0
    sector = (company_info or {}).get("sector", "Unknown")

    # Price trend from history
    price_trend = "flat"
    if history and len(history) >= 2:
        valid = [b for b in history if b.get("close")]
        if len(valid) >= 2:
            delta = ((valid[-1]["close"] - valid[0]["close"]) / valid[0]["close"]) * 100
            price_trend = f"{delta:+.1f}% over last 30 days"

    analyst_rec = calendar.get("analyst_recommendation", "hold")
    earnings_date = calendar.get("earnings_date", "Not announced")
    div_amount = calendar.get("last_dividend", "N/A")
    target_mean = calendar.get("target_mean_price")
    target_str = f"₹{target_mean:.0f}" if target_mean else "N/A"

    # ── 3. AI prompt ─────────────────────────────────────────────────────
    system_prompt = (
        "You are a senior equity research analyst at an Indian brokerage. "
        "Analyze Indian stocks for retail investors. Always return ONLY valid JSON. "
        "Use simple, clear English. Be specific. Reference actual news when possible."
    )

    user_prompt = (
        f"Generate a research report for this Indian stock:\n\n"
        f"Symbol: {symbol}\n"
        f"Company: {company_name}\n"
        f"Sector: {sector}\n"
        f"Current Price: ₹{price:.2f}\n"
        f"Today's Change: {change_pct:+.2f}%\n"
        f"Price Trend: {price_trend}\n"
        f"Analyst Consensus: {analyst_rec}\n"
        f"Analyst Price Target: {target_str}\n"
        f"Next Earnings: {earnings_date}\n"
        f"Last Dividend: {div_amount}\n\n"
        f"Recent News Headlines:\n{headline_block}\n\n"
        f"Return ONLY this JSON (no markdown, no extra text):\n"
        f'{{\n'
        f'  "summary": "3-4 sentence comprehensive analysis referencing actual news",\n'
        f'  "sentiment": "positive" or "neutral" or "negative",\n'
        f'  "impact_level": "bullish" or "neutral" or "bearish",\n'
        f'  "short_term_outlook": "2-3 sentence outlook for next 2-4 weeks",\n'
        f'  "confidence_score": 0.0 to 1.0,\n'
        f'  "key_events": ["event1", "event2", "event3"],\n'
        f'  "analyst_view": "one sentence on analyst consensus and targets",\n'
        f'  "risk_factors": ["risk1", "risk2"]\n'
        f'}}'
    )

    raw = await get_ai_response(system_prompt, user_prompt, max_tokens=800)
    parsed = _parse_json_safe(raw) if raw else None

    # ── 4. Build result ───────────────────────────────────────────────────
    if parsed:
        sentiment = parsed.get("sentiment", "neutral")
        if sentiment not in ("positive", "neutral", "negative"):
            sentiment = "neutral"

        impact = parsed.get("impact_level", "neutral")
        if impact not in ("bullish", "neutral", "bearish"):
            impact = "neutral"

        confidence = float(parsed.get("confidence_score", 0.65))
        confidence = max(0.0, min(1.0, confidence))

        report = {
            "symbol": symbol,
            "company_name": company_name,
            "summary": parsed.get("summary", "Analysis complete."),
            "sentiment": sentiment,
            "impact_level": impact,
            "short_term_outlook": parsed.get("short_term_outlook", ""),
            "confidence_score": round(confidence, 2),
            "key_events": parsed.get("key_events", [])[:5],
            "analyst_view": parsed.get("analyst_view", ""),
            "risk_factors": parsed.get("risk_factors", [])[:3],
            "supporting_data": {
                "price": price,
                "change_pct": change_pct,
                "sector": sector,
                "price_trend": price_trend,
                "analyst_recommendation": analyst_rec,
                "price_target": target_str,
                "earnings_date": earnings_date,
                "last_dividend": str(div_amount),
                "news_count": len(headlines),
                "top_headlines": headlines[:5],
            },
            "generated_at": now.isoformat(),
            "source": "groq-llama3.3",
        }
    else:
        # Rule-based fallback
        logger.warning("AI unavailable for research report %s — using rule-based fallback", symbol)
        report = _fallback_report(symbol, company_name, price, change_pct, sector, headlines, now)

    _cache_set(symbol, report)
    return report


def _fallback_report(
    symbol: str, company_name: str, price: float, change_pct: float,
    sector: str, headlines: list[str], now: datetime
) -> dict:
    """Rule-based fallback when AI is unavailable."""
    if change_pct > 2:
        sentiment, impact = "positive", "bullish"
        summary = (
            f"{company_name} ({symbol}) is showing positive momentum with a "
            f"{change_pct:+.1f}% move. Bullish market conditions and sector strength "
            f"may be contributing factors."
        )
        outlook = "Short-term trend appears positive. Watch for continuation above key levels."
        confidence = 0.55
    elif change_pct < -2:
        sentiment, impact = "negative", "bearish"
        summary = (
            f"{company_name} ({symbol}) is under pressure with a "
            f"{change_pct:+.1f}% decline. Selling pressure or negative news may be driving the move."
        )
        outlook = "Short-term trend is cautious. Wait for stabilization before fresh positions."
        confidence = 0.50
    else:
        sentiment, impact = "neutral", "neutral"
        summary = (
            f"{company_name} ({symbol}) is trading sideways near ₹{price:.0f}. "
            f"No major directional bias detected in recent price action."
        )
        outlook = "Consolidation phase. A breakout in either direction may follow."
        confidence = 0.45

    return {
        "symbol": symbol,
        "company_name": company_name,
        "summary": summary,
        "sentiment": sentiment,
        "impact_level": impact,
        "short_term_outlook": outlook,
        "confidence_score": confidence,
        "key_events": [f"Price: ₹{price:.0f}", f"Change: {change_pct:+.1f}%", f"Sector: {sector}"],
        "analyst_view": "AI analysis unavailable. Consult your broker.",
        "risk_factors": ["Market volatility", "Sector headwinds"],
        "supporting_data": {
            "price": price,
            "change_pct": change_pct,
            "sector": sector,
            "top_headlines": headlines[:3],
        },
        "generated_at": now.isoformat(),
        "source": "rule-based-fallback",
    }


async def persist_report_to_db(symbol: str, report: dict) -> bool:
    """
    Upsert the research report to the ai_research_reports table.
    Returns True on success, False on failure.
    """
    try:
        import json as _json
        from sqlalchemy import select
        from app.database import async_session_factory
        from app.models.ai_research_report import AIResearchReport

        async with async_session_factory() as session:
            # Check if exists
            result = await session.execute(
                select(AIResearchReport).where(AIResearchReport.company_symbol == symbol)
            )
            existing = result.scalar_one_or_none()

            raw_json = _json.dumps(report.get("supporting_data", {}))

            if existing:
                existing.company_name = report.get("company_name", "")
                existing.summary = report.get("summary", "")
                existing.sentiment = report.get("sentiment", "neutral")
                existing.impact_level = report.get("impact_level", "neutral")
                existing.short_term_outlook = report.get("short_term_outlook", "")
                existing.confidence_score = report.get("confidence_score", 0.5)
                existing.raw_data_json = raw_json
                existing.notification_sent = "false"
            else:
                new_report = AIResearchReport(
                    company_symbol=symbol,
                    company_name=report.get("company_name", ""),
                    summary=report.get("summary", ""),
                    sentiment=report.get("sentiment", "neutral"),
                    impact_level=report.get("impact_level", "neutral"),
                    short_term_outlook=report.get("short_term_outlook", ""),
                    confidence_score=report.get("confidence_score", 0.5),
                    raw_data_json=raw_json,
                    notification_sent="false",
                )
                session.add(new_report)

            await session.commit()
            logger.info("Persisted research report for %s", symbol)
            return True
    except Exception as exc:
        logger.error("Failed to persist research report for %s: %s", symbol, exc)
        return False


async def get_report_from_db(symbol: str) -> dict | None:
    """Fetch the latest persisted report from DB."""
    try:
        from sqlalchemy import select
        from app.database import async_session_factory
        from app.models.ai_research_report import AIResearchReport
        import json as _json

        async with async_session_factory() as session:
            result = await session.execute(
                select(AIResearchReport).where(AIResearchReport.company_symbol == symbol)
            )
            row = result.scalar_one_or_none()
            if not row:
                return None

            raw = {}
            if row.raw_data_json:
                try:
                    raw = _json.loads(row.raw_data_json)
                except Exception:
                    pass

            return {
                "symbol": row.company_symbol,
                "company_name": row.company_name or row.company_symbol,
                "summary": row.summary,
                "sentiment": row.sentiment,
                "impact_level": row.impact_level,
                "short_term_outlook": row.short_term_outlook,
                "confidence_score": float(row.confidence_score),
                "supporting_data": raw,
                "generated_at": row.updated_at.isoformat() if row.updated_at else None,
                "source": "database",
            }
    except Exception as exc:
        logger.error("Failed to fetch research report from DB for %s: %s", symbol, exc)
        return None
