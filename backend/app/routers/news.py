"""
News router -- company news, sentiment summary, and market news.

Falls back to live NewsAPI when the database has no articles.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.company import Company
from app.models.news import News
from app.schemas.news import (
    NewsArticle,
    CompanyNewsResponse,
    MarketNewsResponse,
    SentimentSummary,
)
from app.services.news_fetcher import fetch_company_news, fetch_market_news
from app.utils.company_data import get_company_name

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/news", tags=["News"])


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

# Company name lookup — imported from centralized module
# (see app/utils/company_data.py for the single source of truth)


# ═════════════════════════════════════════════════════════════════════════════
# GET /api/news/market/latest
# ═════════════════════════════════════════════════════════════════════════════
# NOTE: This route must be defined BEFORE /{symbol} to avoid path conflicts

@router.get("/market/latest", response_model=MarketNewsResponse)
async def get_market_news(
    limit: int = Query(10, ge=1, le=50, description="Number of articles"),
):
    """
    Get general Indian stock market news.

    Fetched live from NewsAPI. Covers Sensex, Nifty, BSE, NSE keywords.
    """
    from app.utils.cache import get_cached, set_cached
    cache_key = ("route_market_news", limit)
    cached = get_cached(cache_key, 600)  # 10 minutes cache
    if cached is not None:
        return MarketNewsResponse(**cached)

    articles = await fetch_market_news(page_size=limit)

    res_news = MarketNewsResponse(
        total=len(articles),
        articles=[
            NewsArticle(
                headline=a["headline"],
                source=a.get("source"),
                url=a.get("url"),
                published_at=a.get("published_at"),
                image_url=a.get("image_url"),
            )
            for a in articles
        ],
        source="newsapi",
    )
    set_cached(cache_key, res_news.model_dump(mode='json'))
    return res_news


# ═════════════════════════════════════════════════════════════════════════════
# GET /api/news/{symbol}
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/{symbol}", response_model=CompanyNewsResponse)
async def get_company_news(
    symbol: str,
    limit: int = Query(10, ge=1, le=50, description="Number of articles"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get latest news articles for a specific company.

    Returns DB articles if available; otherwise fetches live from NewsAPI.
    """
    from app.utils.cache import get_cached, set_cached
    cache_key = ("route_company_news", symbol.upper(), limit)
    cached = get_cached(cache_key, 300)  # 5 minutes cache
    if cached is not None:
        return CompanyNewsResponse(**cached)

    # Try DB first
    company = None
    try:
        result = await db.execute(
            select(Company).where(Company.symbol == symbol)
        )
        company = result.scalar_one_or_none()

        if company:
            news_result = await db.execute(
                select(News)
                .where(News.company_id == company.id)
                .order_by(desc(News.published_at))
                .limit(limit)
            )
            news_rows = news_result.scalars().all()

            if news_rows:
                res_db = CompanyNewsResponse(
                    symbol=symbol,
                    total=len(news_rows),
                    articles=[
                        NewsArticle(
                            headline=n.headline,
                            source=n.source,
                            url=n.url,
                            published_at=n.published_at,
                            sentiment_score=float(n.sentiment_score) if n.sentiment_score else None,
                            sentiment_label=n.sentiment_label,
                        )
                        for n in news_rows
                    ],
                    source="database",
                )
                set_cached(cache_key, res_db.model_dump(mode='json'))
                return res_db
    except Exception as exc:
        logger.warning("DB news lookup failed for %s (falling back to NewsAPI): %s", symbol, exc)

    # Fallback: live NewsAPI
    company_name = get_company_name(symbol)
    articles = await fetch_company_news(company_name, symbol, page_size=limit)

    if not articles:
        raise HTTPException(
            status_code=404,
            detail=f"No news found for '{symbol}'. Set NEWS_API_KEY in .env for live news.",
        )

    res_live = CompanyNewsResponse(
        symbol=symbol,
        total=len(articles),
        articles=[
            NewsArticle(
                headline=a["headline"],
                source=a.get("source"),
                url=a.get("url"),
                published_at=a.get("published_at"),
                image_url=a.get("image_url"),
            )
            for a in articles
        ],
        source="newsapi",
    )
    set_cached(cache_key, res_live.model_dump(mode='json'))
    return res_live


# ═════════════════════════════════════════════════════════════════════════════
# GET /api/news/{symbol}/sentiment
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/{symbol}/sentiment", response_model=SentimentSummary)
async def get_sentiment_summary(
    symbol: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get aggregated sentiment stats for a company's news articles.

    Returns average score, label counts, and overall sentiment.
    Requires news to be stored in the database with sentiment scores
    (populated by the AI service in Session 4).
    """
    try:
        result = await db.execute(
            select(Company).where(Company.symbol == symbol)
        )
        company = result.scalar_one_or_none()
    except Exception as exc:
        logger.warning("DB sentiment lookup failed for %s: %s", symbol, exc)
        return SentimentSummary(
            symbol=symbol,
            total_articles=0,
            overall_label="database unavailable",
        )

    if not company:
        raise HTTPException(status_code=404, detail=f"Company '{symbol}' not found in database")

    try:
        # Count total articles
        total_result = await db.execute(
            select(func.count(News.id)).where(News.company_id == company.id)
        )
        total = total_result.scalar_one()

        if total == 0:
            return SentimentSummary(
                symbol=symbol,
                total_articles=0,
                avg_sentiment_score=None,
                positive_count=0,
                negative_count=0,
                neutral_count=0,
                overall_label="no data",
            )

        # Average sentiment
        avg_result = await db.execute(
            select(func.avg(News.sentiment_score))
            .where(News.company_id == company.id)
            .where(News.sentiment_score.isnot(None))
        )
        avg_score = avg_result.scalar_one()

        # Count by label
        positive_result = await db.execute(
            select(func.count(News.id))
            .where(News.company_id == company.id)
            .where(News.sentiment_label == "positive")
        )
        positive = positive_result.scalar_one()

        negative_result = await db.execute(
            select(func.count(News.id))
            .where(News.company_id == company.id)
            .where(News.sentiment_label == "negative")
        )
        negative = negative_result.scalar_one()

        neutral = total - positive - negative

        # Determine overall
        if avg_score is not None:
            if float(avg_score) > 0.15:
                overall = "positive"
            elif float(avg_score) < -0.15:
                overall = "negative"
            else:
                overall = "neutral"
        else:
            overall = "no scores"

        return SentimentSummary(
            symbol=symbol,
            total_articles=total,
            avg_sentiment_score=round(float(avg_score), 3) if avg_score else None,
            positive_count=positive,
            negative_count=negative,
            neutral_count=neutral,
            overall_label=overall,
        )
    except Exception as exc:
        logger.warning("DB sentiment aggregation failed for %s: %s", symbol, exc)
        return SentimentSummary(
            symbol=symbol,
            total_articles=0,
            overall_label="database error",
        )
