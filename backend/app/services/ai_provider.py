"""
Multi-Provider AI Client
════════════════════════
Priority order:
  1. Groq (free, fast) — llama-3.3-70b-versatile
  2. OpenAI GPT-4o-mini — paid backup
  3. Returns None → caller uses rule-based fallback

Also provides VADER-based free sentiment analysis.
"""

import logging

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


# ═════════════════════════════════════════════════════════════════════════════
# Async AI chat — Groq → OpenAI → None
# ═════════════════════════════════════════════════════════════════════════════

async def get_ai_response(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 1000,
) -> str | None:
    """
    Try AI providers in order. Returns raw text or None.

    1. Groq llama-3.3-70b (free, fast) — primary
    2. OpenAI GPT-4o-mini (paid)       — backup
    3. None                             — triggers rule-based fallback
    """
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    # ── 1. Groq (free) ───────────────────────────────────────────────────
    groq_key = getattr(settings, "GROQ_API_KEY", "") or ""
    if groq_key:
        try:
            from groq import AsyncGroq
            client = AsyncGroq(api_key=groq_key)
            resp = await client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                temperature=0.3,
                max_tokens=max_tokens,
            )
            content = resp.choices[0].message.content.strip()
            logger.info("Groq (llama-3.3-70b) responded successfully")
            return content
        except Exception as exc:
            logger.warning("Groq failed: %s — trying OpenAI", exc)

    # ── 2. OpenAI (paid backup) ─────────────────────────────────────────
    openai_key = getattr(settings, "OPENAI_API_KEY", "") or ""
    if openai_key:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=openai_key)
            resp = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0.3,
                max_tokens=max_tokens,
            )
            content = resp.choices[0].message.content.strip()
            logger.info("OpenAI GPT-4o-mini responded successfully")
            return content
        except Exception as exc:
            logger.warning("OpenAI failed: %s — using rule-based fallback", exc)

    logger.warning("All AI providers unavailable — rule-based fallback will be used")
    return None


# ═════════════════════════════════════════════════════════════════════════════
# Free sentiment analysis using VADER (no API calls)
# ═════════════════════════════════════════════════════════════════════════════

def analyze_sentiment_free(text: str) -> dict:
    """
    Instant, free sentiment analysis using VADER.
    No API call needed. Works offline.

    Returns:
        {"score": float, "label": str}
        score range: -1.0 (very negative) to +1.0 (very positive)
        label: "positive" | "negative" | "neutral"
    """
    try:
        from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
        analyzer = SentimentIntensityAnalyzer()
        scores = analyzer.polarity_scores(text)
        compound = scores["compound"]

        if compound >= 0.05:
            label = "positive"
        elif compound <= -0.05:
            label = "negative"
        else:
            label = "neutral"

        return {
            "score": round(compound, 3),
            "label": label,
        }
    except Exception as exc:
        logger.warning("VADER sentiment failed: %s", exc)
        return {"score": 0.0, "label": "neutral"}


def analyze_sentiment_batch(headlines: list[str]) -> dict:
    """
    Analyze a list of headlines and return aggregated sentiment.

    Returns:
        {
            "overall_sentiment": str,
            "score": float,
            "key_themes": list[str],
            "summary": str,
        }
    """
    if not headlines:
        return {
            "overall_sentiment": "neutral",
            "score": 0.0,
            "key_themes": [],
            "summary": "No headlines to analyze.",
        }

    scores = [analyze_sentiment_free(h)["score"] for h in headlines]
    avg_score = sum(scores) / len(scores)

    positive = sum(1 for s in scores if s >= 0.05)
    negative = sum(1 for s in scores if s <= -0.05)
    neutral = len(scores) - positive - negative

    if avg_score >= 0.05:
        overall = "positive"
        summary = f"{positive} of {len(headlines)} headlines are positive. Market sentiment appears favorable."
    elif avg_score <= -0.05:
        overall = "negative"
        summary = f"{negative} of {len(headlines)} headlines are negative. Market sentiment appears cautious."
    else:
        overall = "neutral"
        summary = f"Mixed sentiment across {len(headlines)} headlines. No clear directional bias."

    return {
        "overall_sentiment": overall,
        "score": round(avg_score, 3),
        "key_themes": [],
        "summary": summary,
        "breakdown": {
            "positive": positive,
            "negative": negative,
            "neutral": neutral,
        },
    }
