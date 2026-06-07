"""
AI Insights service — multi-provider AI stock analysis.

Provides:
  - explain_price_movement()  -- why did this stock move?
  - get_stock_summary()       -- buy/sell/hold signal + risk
  - analyze_news_sentiment()  -- headline sentiment scoring (VADER, free)

AI priority: Groq (free) → OpenAI → rule-based fallback.
Results are cached in-memory with TTL.
"""

import json
import logging
import time
from datetime import datetime, timezone

from app.config import get_settings
from app.services.ai_provider import get_ai_response, analyze_sentiment_batch
from app.services.stock_fetcher import (
    fetch_stock_quote,
    fetch_stock_history,
    fetch_company_info,
)
from app.services.news_fetcher import fetch_company_news
from app.utils.company_data import get_company_name

logger = logging.getLogger(__name__)
settings = get_settings()


# ═════════════════════════════════════════════════════════════════════════════
# In-memory TTL cache
# ═════════════════════════════════════════════════════════════════════════════

_cache: dict[str, dict] = {}

WHY_MOVED_TTL = 30 * 60     # 30 minutes
SUMMARY_TTL = 15 * 60       # 15 minutes
SENTIMENT_TTL = 60 * 60     # 60 minutes


def _cache_get(key: str) -> dict | None:
    """Get a value from cache if it exists and hasn't expired."""
    entry = _cache.get(key)
    if not entry:
        return None
    if time.time() - entry["ts"] > entry["ttl"]:
        del _cache[key]
        return None
    return entry["data"]


def _cache_set(key: str, data: dict, ttl: int) -> None:
    """Store a value in cache with TTL."""
    _cache[key] = {"data": data, "ts": time.time(), "ttl": ttl}
    # Evict old entries if cache grows too large (> 500 entries)
    if len(_cache) > 500:
        now = time.time()
        expired = [k for k, v in _cache.items() if now - v["ts"] > v["ttl"]]
        for k in expired:
            del _cache[k]


# ═════════════════════════════════════════════════════════════════════════════
# AI helpers — delegates to ai_provider (Groq → OpenAI → None)
# ═════════════════════════════════════════════════════════════════════════════

async def _chat(system_prompt: str, user_prompt: str, max_tokens: int = 600) -> str | None:
    """
    Wrapper: calls ai_provider.get_ai_response (Groq → OpenAI → None).
    """
    return await get_ai_response(system_prompt, user_prompt, max_tokens)


def _parse_json(text: str) -> dict | None:
    """Try to extract JSON from AI response (handles markdown fences)."""
    if not text:
        return None
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        cleaned = "\n".join(lines)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning("Failed to parse JSON from AI response: %.200s", text)
        return None


# Company name helper — imported from centralized module
# (see app/utils/company_data.py for the single source of truth)


# ═════════════════════════════════════════════════════════════════════════════
# Task 1a: explain_price_movement
# ═════════════════════════════════════════════════════════════════════════════

async def explain_price_movement(symbol: str) -> dict:
    """
    AI explanation of why a stock price moved over the last 7 days.

    Steps:
      1. Fetch 7-day price history
      2. Fetch 10 recent news headlines
      3. Calculate price change %
      4. Call OpenAI for explanation
      5. Return structured result (with fallback if AI fails)
    """
    cache_key = f"why_moved:{symbol}"
    cached = _cache_get(cache_key)
    if cached:
        logger.info("Cache hit for %s", cache_key)
        return cached

    now = datetime.now(timezone.utc)
    today = now.date().isoformat()

    # ── Step 1: Price history ────────────────────────────────────────────
    history = await fetch_stock_history(symbol, period="7d", interval="1d")

    price_change_pct = None
    direction = "flat"
    first_close = None
    last_close = None

    if history and len(history) >= 2:
        # Filter out NaN values
        valid = [bar for bar in history if bar.get("close") and bar["close"] == bar["close"]]
        if len(valid) >= 2:
            first_close = valid[0]["close"]
            last_close = valid[-1]["close"]
            if first_close and first_close > 0:
                price_change_pct = round(((last_close - first_close) / first_close) * 100, 2)
                direction = "up" if price_change_pct > 0 else "down" if price_change_pct < 0 else "flat"

    # ── Step 2: Recent news ──────────────────────────────────────────────
    company_name = get_company_name(symbol)
    news_articles = await fetch_company_news(company_name, symbol, page_size=10)
    headlines = [a["headline"] for a in news_articles if a.get("headline")]

    # ── Step 3: AI call ──────────────────────────────────────────────────
    headline_block = "\n".join(f"- {h}" for h in headlines[:10]) if headlines else "- No recent news available"
    pct_str = f"{price_change_pct:+.2f}" if price_change_pct is not None else "unknown"

    system_prompt = (
        "You are an expert Indian stock market analyst writing for retail investors. "
        "Given a stock's recent price movement and news headlines, explain what happened. "
        "Return ONLY valid JSON with these keys:\n"
        '  "explanation": string (3-4 clear sentences, simple language),\n'
        '  "key_factors": list of 3-4 short strings (specific reasons),\n'
        '  "confidence": string ("high", "medium", or "low")'
    )

    user_prompt = (
        f"Stock: {symbol} ({company_name})\n"
        f"Price change: {pct_str}% over last 7 days\n"
        f"Direction: {direction}\n\n"
        f"Recent headlines:\n{headline_block}\n\n"
        f"Explain why this stock moved. Be specific. Reference actual news when possible."
    )

    raw = await _chat(system_prompt, user_prompt)
    parsed = _parse_json(raw)

    if parsed:
        result = {
            "symbol": symbol,
            "date": today,
            "price_change_pct": price_change_pct,
            "direction": direction,
            "explanation": parsed.get("explanation", "Analysis generated."),
            "key_factors": parsed.get("key_factors", []),
            "confidence": parsed.get("confidence", "medium"),
            "recent_news": headlines[:5],
            "generated_at": now.isoformat(),
            "source": "openai-gpt4o-mini",
        }
    else:
        # ── Fallback: rule-based response ────────────────────────────────
        logger.warning("AI failed for %s, using rule-based fallback", symbol)
        result = _fallback_why_moved(symbol, today, price_change_pct, direction, headlines)

    _cache_set(cache_key, result, WHY_MOVED_TTL)
    return result


def _fallback_why_moved(
    symbol: str, date: str, pct: float | None, direction: str, headlines: list[str]
) -> dict:
    """Rule-based fallback when OpenAI is unavailable."""
    if pct is not None:
        if abs(pct) > 5:
            explanation = (
                f"{symbol} moved {pct:+.2f}% over the past week, which is a significant swing. "
                f"Such large moves are typically driven by earnings results, regulatory changes, "
                f"or major sector-wide events. Check recent company announcements for specifics."
            )
        elif abs(pct) > 2:
            explanation = (
                f"{symbol} moved {pct:+.2f}% this week. Moderate moves like this are often "
                f"caused by institutional buying/selling, sector rotation, or market-wide sentiment shifts."
            )
        else:
            explanation = (
                f"{symbol} was largely flat this week ({pct:+.2f}%), suggesting the stock is consolidating. "
                f"Low volatility periods often precede larger moves."
            )
    else:
        explanation = f"Price data unavailable for {symbol}. Unable to determine movement reason."

    factors = []
    if pct is not None:
        if direction == "up":
            factors = ["Positive market sentiment", "Possible institutional buying", "Sector tailwinds"]
        elif direction == "down":
            factors = ["Profit booking or selling pressure", "Possible negative news", "Market weakness"]
        else:
            factors = ["Consolidation phase", "Low trading volume", "Awaiting catalyst"]

    return {
        "symbol": symbol,
        "date": date,
        "price_change_pct": pct,
        "direction": direction,
        "explanation": explanation,
        "key_factors": factors,
        "confidence": "low",
        "recent_news": headlines[:5],
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "rule-based-fallback",
    }


# ═════════════════════════════════════════════════════════════════════════════
# Task 1b: get_stock_summary
# ═════════════════════════════════════════════════════════════════════════════

async def get_stock_summary(symbol: str) -> dict:
    """
    AI-generated investment summary with buy/sell/hold signal.

    Steps:
      1. Fetch current quote + company info
      2. Detect rule-based signals (volume, 52w extremes)
      3. Call OpenAI for structured summary
      4. Return with fallback if AI fails
    """
    cache_key = f"summary:{symbol}"
    cached = _cache_get(cache_key)
    if cached:
        logger.info("Cache hit for %s", cache_key)
        return cached

    now = datetime.now(timezone.utc)

    # ── Step 1: Fetch data ───────────────────────────────────────────────
    quote = await fetch_stock_quote(symbol)
    if not quote:
        return _fallback_summary(symbol, now)

    company_info = await fetch_company_info(symbol)
    company_name = company_info.get("name", symbol) if company_info else symbol
    sector = company_info.get("sector", "Unknown") if company_info else "Unknown"

    close = quote.get("close", 0)
    high = quote.get("high", 0)
    low = quote.get("low", 0)
    volume = quote.get("volume", 0)
    open_price = quote.get("open", 0)

    # ── Step 2: Rule-based signal detection ──────────────────────────────
    signals = []

    # Volume analysis: check if significantly above average
    history = await fetch_stock_history(symbol, period="1mo", interval="1d")
    avg_volume = 0
    if history:
        valid_vols = [bar["volume"] for bar in history if bar.get("volume") and bar["volume"] == bar["volume"]]
        if valid_vols:
            avg_volume = sum(valid_vols) / len(valid_vols)
            if volume > 2 * avg_volume:
                signals.append("Unusual volume (2x+ above 30-day average)")

    # Price range signals from yfinance info
    if company_info:
        fifty_two_low = company_info.get("fifty_two_week_low")
        fifty_two_high = company_info.get("fifty_two_week_high")
        # Note: yfinance info doesn't always have these; work with what we have

    # Intraday momentum
    if open_price and close:
        intraday_change = ((close - open_price) / open_price) * 100 if open_price > 0 else 0
        if intraday_change > 3:
            signals.append(f"Strong intraday rally ({intraday_change:+.1f}%)")
        elif intraday_change < -3:
            signals.append(f"Sharp intraday decline ({intraday_change:+.1f}%)")

    # Weekly trend from history
    if history and len(history) >= 5:
        valid = [b for b in history if b.get("close") and b["close"] == b["close"]]
        if len(valid) >= 5:
            week_start = valid[-5]["close"]
            week_end = valid[-1]["close"]
            week_change = ((week_end - week_start) / week_start) * 100 if week_start > 0 else 0
            if week_change > 5:
                signals.append(f"Strong weekly uptrend ({week_change:+.1f}%)")
            elif week_change < -5:
                signals.append(f"Bearish weekly trend ({week_change:+.1f}%)")

    if not signals:
        signals.append("No unusual signals detected")

    signals_str = "; ".join(signals)

    # ── Step 3: AI call ──────────────────────────────────────────────────
    system_prompt = (
        "You are an expert Indian stock market analyst. "
        "Given a stock's current data and detected signals, provide an investment summary. "
        "Return ONLY valid JSON with these keys:\n"
        '  "signal": string (one of: "buy", "sell", "hold", "watch"),\n'
        '  "risk_level": string (one of: "low", "medium", "high"),\n'
        '  "confidence": float (0.0 to 1.0),\n'
        '  "reasoning": string (2-3 sentences, clear for retail investors),\n'
        '  "reasons": list of 3 short strings (bullet-point reasons)'
    )

    user_prompt = (
        f"Stock: {symbol} ({company_name})\n"
        f"Sector: {sector}\n"
        f"Current price: {close:.2f}\n"
        f"Day range: {low:.2f} - {high:.2f}\n"
        f"Volume: {volume:,.0f} (30d avg: {avg_volume:,.0f})\n"
        f"Detected signals: {signals_str}\n\n"
        f"Provide your investment summary."
    )

    raw = await _chat(system_prompt, user_prompt)
    parsed = _parse_json(raw)

    if parsed:
        signal = parsed.get("signal", "hold")
        if signal not in ("buy", "sell", "hold", "watch"):
            signal = "hold"

        risk = parsed.get("risk_level", "medium")
        if risk not in ("low", "medium", "high"):
            risk = "medium"

        confidence = parsed.get("confidence", 0.5)
        if not isinstance(confidence, (int, float)):
            confidence = 0.5
        confidence = max(0.0, min(1.0, float(confidence)))

        reasons = parsed.get("reasons", [])
        reasoning = parsed.get("reasoning", "Analysis complete.")

        result = {
            "symbol": symbol,
            "signal": signal,
            "risk_level": risk,
            "confidence": confidence,
            "reasoning": reasoning,
            "key_metrics": {
                "current_price": close,
                "day_high": high,
                "day_low": low,
                "volume": volume,
                "avg_volume_30d": round(avg_volume),
                "sector": sector,
                "signals": signals_str,
            },
            "reasons": reasons,
            "generated_at": now.isoformat(),
            "source": "groq-llama3.3",  # ai_provider auto-selects Groq → OpenAI
        }
    else:
        logger.warning("AI failed for summary %s, using fallback", symbol)
        result = _fallback_summary(symbol, now, quote, signals, sector)

    _cache_set(cache_key, result, SUMMARY_TTL)
    return result


def _fallback_summary(
    symbol: str,
    now: datetime,
    quote: dict | None = None,
    signals: list[str] | None = None,
    sector: str = "Unknown",
) -> dict:
    """Rule-based fallback summary."""
    close = quote.get("close", 0) if quote else 0
    high = quote.get("high", 0) if quote else 0
    low = quote.get("low", 0) if quote else 0
    volume = quote.get("volume", 0) if quote else 0

    return {
        "symbol": symbol,
        "signal": "hold",
        "risk_level": "medium",
        "confidence": 0.3,
        "reasoning": (
            f"{symbol} is currently trading at {close:.2f}. "
            f"Without AI analysis, a 'hold' recommendation is issued by default. "
            f"Monitor volume trends and upcoming earnings for clearer signals."
        ),
        "key_metrics": {
            "current_price": close,
            "day_high": high,
            "day_low": low,
            "volume": volume,
            "sector": sector,
            "signals": "; ".join(signals) if signals else "N/A",
        },
        "reasons": [
            "Default hold -- AI analysis unavailable",
            f"Sector: {sector}",
            "Review company fundamentals before acting",
        ],
        "generated_at": now.isoformat(),
        "source": "rule-based-fallback",
    }


# ═════════════════════════════════════════════════════════════════════════════
# Task 1c: analyze_news_sentiment
# ═════════════════════════════════════════════════════════════════════════════

async def analyze_news_sentiment(headlines: list[str]) -> dict:
    """
    Analyze sentiment of news headlines.
    Uses VADER (free, instant) — no API call needed.
    Falls back to neutral if VADER unavailable.
    """
    cache_key = f"sentiment:{hash(tuple(sorted(headlines[:10])))}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    result = analyze_sentiment_batch(headlines)
    _cache_set(cache_key, result, SENTIMENT_TTL)
    return result


# ═════════════════════════════════════════════════════════════════════════════
# Task 1d: predict_price_outlook
# ═════════════════════════════════════════════════════════════════════════════

async def predict_price_outlook(symbol: str) -> dict:
    """Predict 2-4 week outlook using technicals + news sentiment."""
    cache_key = f"outlook:{symbol}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    now = datetime.now(timezone.utc)
    
    # ── Step 1: Fetch 30d history ─────────────────────────────────────────
    history = await fetch_stock_history(symbol, period="1mo", interval="1d")
    
    # ── Step 2: Fetch 15 news headlines ───────────────────────────────────
    company_name = get_company_name(symbol)
    news_articles = await fetch_company_news(company_name, symbol, page_size=15)
    headlines = [a["headline"] for a in news_articles if a.get("headline")]

    # ── Step 3: Calculate technical signals ───────────────────────────────
    if not history or len(history) < 2:
        return _fallback_outlook(symbol, now, None, None, None)
        
    valid = [bar for bar in history if bar.get("close")]
    if len(valid) < 2:
        return _fallback_outlook(symbol, now, None, None, None)
        
    closes = [bar["close"] for bar in valid]
    volumes = [bar.get("volume", 0) for bar in valid]
    
    current_price = closes[-1]
    
    # Get 7d ago and 14d ago prices (trading days)
    idx_7d = max(0, len(valid) - 6) # ~1 week of trading days is 5, but we go back by index
    idx_14d = max(0, len(valid) - 11) # ~2 weeks
    
    price_7d_ago = closes[idx_7d]
    price_14d_ago = closes[idx_14d]
    
    trend_7d = ((current_price - price_7d_ago) / price_7d_ago) * 100 if price_7d_ago > 0 else 0
    trend_14d = ((current_price - price_14d_ago) / price_14d_ago) * 100 if price_14d_ago > 0 else 0
    
    ma_30 = sum(closes) / len(closes)
    above_ma = current_price > ma_30
    
    # Simple volume trend: compare last 5 days to previous 5 days
    vol_last_5 = sum(volumes[-5:])
    vol_prev_5 = sum(volumes[-10:-5]) if len(volumes) >= 10 else vol_last_5
    volume_trend = "increasing" if vol_last_5 > vol_prev_5 else "decreasing"
    
    # ── Step 4: Call OpenAI ───────────────────────────────────────────────
    headline_block = "\n".join(f"- {h}" for h in headlines[:10]) if headlines else "- No recent news available"
    
    system_prompt = (
        "You are a senior financial analyst specializing in Indian equity markets (NSE/BSE). "
        "Always respond with valid JSON only."
    )
    
    user_prompt = (
        f"Analyze this Indian stock and provide a 2-4 week outlook.\n\n"
        f"Stock: {symbol}\n"
        f"Current Price: ₹{current_price:.2f}\n"
        f"7-day change: {trend_7d:.1f}%\n"
        f"14-day change: {trend_14d:.1f}%\n"
        f"30-day MA: ₹{ma_30:.1f}\n"
        f"Price vs MA: {'above' if above_ma else 'below'}\n"
        f"Volume trend: {volume_trend}\n\n"
        f"Recent headlines:\n{headline_block}\n\n"
        f"Consider: RBI policy, FII flows, global market cues, sector rotation.\n"
        f"Return ONLY this JSON (no markdown):\n"
        f"{{\n"
        f"  \"direction\": \"bullish\" or \"bearish\" or \"neutral\",\n"
        f"  \"confidence\": \"high\" or \"medium\" or \"low\",\n"
        f"  \"price_target_low\": number,\n"
        f"  \"price_target_high\": number,\n"
        f"  \"short_summary\": \"one sentence explanation\",\n"
        f"  \"key_catalysts\": [\"catalyst1\", \"catalyst2\", \"catalyst3\"],\n"
        f"  \"risks\": [\"risk1\", \"risk2\"],\n"
        f"  \"technical_view\": \"oversold\" or \"overbought\" or \"neutral\",\n"
        f"  \"recommendation\": \"strong_buy\" or \"buy\" or \"hold\" or \"sell\" or \"strong_sell\"\n"
        f"}}"
    )
    
    raw = await _chat(system_prompt, user_prompt, max_tokens=700)
    parsed = _parse_json(raw)
    
    # ── Step 5: Parse JSON ────────────────────────────────────────────────
    if parsed:
        result = parsed
        result["symbol"] = symbol
        result["current_price"] = current_price
        result["generated_at"] = now.isoformat()
        result["source"] = "groq-llama3.3"  # ai_provider auto-selects Groq → OpenAI
    else:
        logger.warning("AI failed for outlook %s, using rule-based fallback", symbol)
        result = _fallback_outlook(symbol, now, current_price, trend_7d, trend_14d)

    # ── Step 6: Cache 60 minutes ──────────────────────────────────────────
    _cache_set(cache_key, result, 60 * 60)
    return result


def _fallback_outlook(symbol, now, current_price, trend_7d, trend_14d):
    """Rule-based fallback outlook with real price targets."""
    p = current_price or 0
    if p == 0:
        return {
            "symbol": symbol,
            "direction": "neutral",
            "confidence": "low",
            "price_target_low": None,
            "price_target_high": None,
            "short_summary": "Insufficient price data to generate outlook.",
            "key_catalysts": ["Awaiting data"],
            "risks": ["Price data unavailable"],
            "technical_view": "neutral",
            "recommendation": "hold",
            "current_price": 0,
            "generated_at": now.isoformat(),
            "source": "rule-based-fallback",
        }
    
    if trend_7d > 0 and trend_14d > 0:
        direction = "bullish"
        recommendation = "buy"
        technical_view = "overbought" if trend_7d > 10 else "neutral"
    elif trend_7d < 0 and trend_14d < 0:
        direction = "bearish"
        recommendation = "sell"
        technical_view = "oversold" if trend_7d < -10 else "neutral"
    else:
        direction = "neutral"
        recommendation = "hold"
        technical_view = "neutral"
        
    return {
        "symbol": symbol,
        "direction": direction,
        "confidence": "medium",
        "price_target_low": round(current_price * 0.975, 2),
        "price_target_high": round(current_price * 1.025, 2),
        "short_summary": f"Rule-based prediction derived from {trend_7d:.1f}% 7d trend.",
        "key_catalysts": ["Continuation of current trend"],
        "risks": ["Unexpected market shifts", "Earnings surprises"],
        "technical_view": technical_view,
        "recommendation": recommendation,
        "current_price": current_price,
        "generated_at": now.isoformat(),
        "source": "rule-based-fallback"
    }


# ═════════════════════════════════════════════════════════════════════════════
# Task 1e: get_weekly_nifty_outlook
# ═════════════════════════════════════════════════════════════════════════════

async def get_weekly_nifty_outlook() -> dict:
    """Market-wide weekly outlook using ^NSEI."""
    cache_key = "outlook:nifty_weekly"
    cached = _cache_get(cache_key)
    if cached:
        return cached
        
    now = datetime.now(timezone.utc)
    symbol = "^NSEI"
    
    # Fetch data
    history = await fetch_stock_history(symbol, period="1mo", interval="1d")
    news_articles = await fetch_company_news("Nifty 50 Indian Market", symbol, page_size=15)
    headlines = [a["headline"] for a in news_articles if a.get("headline")]
    
    nifty_change_pct = 0
    if history and len(history) >= 2:
        valid = [bar for bar in history if bar.get("close")]
        if len(valid) >= 6:
            start = valid[-6]["close"]
            end = valid[-1]["close"]
            nifty_change_pct = ((end - start) / start) * 100 if start > 0 else 0
            
    headline_block = "\n".join(f"- {h}" for h in headlines[:10]) if headlines else "- No recent market news"
    
    system_prompt = (
        "You are the Chief Equity Strategist for the Indian market. "
        "Always respond with valid JSON only."
    )
    
    user_prompt = (
        f"Provide a weekly market outlook for the Indian stock market.\\n"
        f"Nifty 50 1-week change: {nifty_change_pct:.2f}%\\n\\n"
        f"Recent macro headlines:\\n{headline_block}\\n\\n"
        f"Return ONLY this JSON:\\n"
        f"{{\\n"
        f"  \\\"nifty_direction\\\": \\\"bullish\\\" or \\\"bearish\\\" or \\\"neutral\\\",\\n"
        f"  \\\"nifty_change_pct\\\": {nifty_change_pct:.2f},\\n"
        f"  \\\"key_factors\\\": [\\\"macro factor 1\\\", \\\"macro factor 2\\\", \\\"macro factor 3\\\"],\\n"
        f"  \\\"stocks_to_watch\\\": [\\n"
        f"    {{\\\"symbol\\\": \\\"RELIANCE.NS\\\", \\\"reason\\\": \\\"Earnings expected\\\"}},\\n"
        f"    {{\\\"symbol\\\": \\\"TCS.NS\\\", \\\"reason\\\": \\\"Strong IT demand\\\"}}\\n"
        f"  ],\\n"
        f"  \\\"market_summary\\\": \\\"2 sentence market overview\\\"\\n"
        f"}}"
    )
    
    raw = await _chat(system_prompt, user_prompt, max_tokens=600)
    parsed = _parse_json(raw)
    
    if parsed:
        result = parsed
    else:
        logger.warning("AI failed for weekly outlook, using fallback")
        direction = "bullish" if nifty_change_pct > 0 else "bearish" if nifty_change_pct < 0 else "neutral"
        result = {
            "nifty_direction": direction,
            "nifty_change_pct": round(nifty_change_pct, 2),
            "key_factors": ["Rule-based inference", "Awaiting AI", "Market normalization"],
            "stocks_to_watch": [
                {"symbol": "RELIANCE.NS", "reason": "Index heavyweight"},
                {"symbol": "HDFCBANK.NS", "reason": "Banking bellwether"}
            ],
            "market_summary": "Weekly market direction inferred from recent price action directly."
        }
        
    result["generated_at"] = now.isoformat()
    
    # Cache 6 hours
    _cache_set(cache_key, result, 6 * 60 * 60)
    return result
