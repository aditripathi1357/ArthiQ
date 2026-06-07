"""
News Fetcher — Multi-source, keyword-filtered, Indian market focused.

Source priority:
  1. NewsAPI with strict financial keyword filter
  2. RSS feeds (ET Markets, Moneycontrol, Business Standard, Livemint)
  3. Google News RSS
  4. yfinance news (fallback)
  5. Mock data (last resort)

All articles are VADER-sentiment scored on fetch.
All non-financial articles are filtered out.
"""

import asyncio
import logging
import re
from datetime import datetime, timezone
from functools import partial

import feedparser
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import async_session_factory
from app.models.company import Company
from app.models.news import News
from app.services.ai_provider import analyze_sentiment_free

logger = logging.getLogger(__name__)
settings = get_settings()

NEWS_API_BASE = "https://newsapi.org/v2"

# ═════════════════════════════════════════════════════════════════════════════
# Financial keyword filter
# ═════════════════════════════════════════════════════════════════════════════

FINANCIAL_KEYWORDS = {
    "stock", "market", "nse", "bse", "nifty", "sensex", "rupee", "rbi",
    "sebi", "fii", "dii", "ipo", "equity", "shares", "trading", "economy",
    "gdp", "inflation", "earnings", "results", "profit", "revenue", "crore",
    "lakh", "interest rate", "monetary", "fiscal", "budget", "investment",
    "funds", "mutual fund", "etf", "bonds", "commodity", "crude", "gold",
    "silver", "dollar", "forex", "derivative", "futures", "options",
    "rally", "fall", "gain", "loss", "quarter", "annual", "dividend",
    "buyback", "merger", "acquisition", "ipo listing", "demerger",
    "smallcap", "midcap", "largecap", "index", "benchmark", "portfolio",
    "hedge", "volatility", "correction", "bull", "bear", "intraday",
    "open interest", "circuit breaker", "upper circuit", "lower circuit",
    "promoter", "shareholding", "ebitda", "eps", "pe ratio", "market cap",
    "sector", "industry", "analyst", "target price", "upgrade", "downgrade",
}

BLOCKED_DOMAINS = {
    "plos.org", "nature.com", "sciencedaily.com", "artnews.com",
    "bikeexif.com", "allrecipes.com", "epicurious.com", "travelandleisure.com",
    "healthline.com", "webmd.com", "medicalnewstoday.com",
    "smithsonianmag.com", "nationalgeographic.com",
}

# Market news RSS feeds (free, no API key)
RSS_FEEDS = {
    "Economic Times Markets": "https://economictimes.indiatimes.com/markets/rss.cms",
    "Moneycontrol": "https://www.moneycontrol.com/rss/marketreport.xml",
    "Business Standard Markets": "https://www.business-standard.com/rss/markets-106.rss",
    "Livemint Markets": "https://www.livemint.com/rss/markets",
    "NDTV Profit": "https://feeds.feedburner.com/ndtvprofit-latest",
}

# Google News RSS queries for Indian markets
GOOGLE_NEWS_MARKET_QUERIES = [
    "Indian stock market NSE BSE",
    "Nifty Sensex today",
    "Indian economy RBI SEBI",
]

# NewsAPI market queries (rotated to get diverse coverage)
MARKET_QUERIES = [
    "NSE BSE Nifty Sensex stock market",
    "Indian stock market today",
    "RBI interest rate India economy",
    "FII DII Indian equity market",
    "SEBI India stocks regulation",
    "quarterly results earnings NSE India",
    "Indian rupee INR dollar",
    "Nifty 50 Sensex rally fall",
]


# ═════════════════════════════════════════════════════════════════════════════
# Filter helpers
# ═════════════════════════════════════════════════════════════════════════════

def _is_financial_article(headline: str, url: str = "") -> bool:
    """Return True if article is relevant to Indian financial markets."""
    if not headline:
        return False

    # Block known non-financial domains
    if url:
        for domain in BLOCKED_DOMAINS:
            if domain in url.lower():
                return False

    headline_lower = headline.lower()
    return any(kw in headline_lower for kw in FINANCIAL_KEYWORDS)


def _extract_image_from_summary(entry) -> str | None:
    """Extract first image URL from RSS entry summary HTML."""
    try:
        summary = getattr(entry, "summary", "") or ""
        match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', summary, re.IGNORECASE)
        if match:
            return match.group(1)
        # Also check media_content
        media = getattr(entry, "media_content", [])
        if media and isinstance(media, list) and media[0].get("url"):
            return media[0]["url"]
    except Exception:
        pass
    return None


def _parse_rss_date(entry) -> datetime | None:
    """Parse published date from RSS entry."""
    try:
        import email.utils
        published = getattr(entry, "published", None) or getattr(entry, "updated", None)
        if not published:
            return datetime.now(timezone.utc)
        # feedparser gives parsed time as time.struct_time
        parsed = getattr(entry, "published_parsed", None) or getattr(entry, "updated_parsed", None)
        if parsed:
            import calendar
            return datetime.fromtimestamp(calendar.timegm(parsed), tz=timezone.utc)
        return datetime.now(timezone.utc)
    except Exception:
        return datetime.now(timezone.utc)


def _deduplicate(articles: list[dict]) -> list[dict]:
    """Remove duplicates by URL and by first-50-chars of headline."""
    seen_urls: set[str] = set()
    seen_prefixes: set[str] = set()
    unique = []
    for a in articles:
        url = a.get("url") or ""
        headline = a.get("headline") or ""
        prefix = headline[:50].lower()
        if url and url in seen_urls:
            continue
        if prefix and prefix in seen_prefixes:
            continue
        seen_urls.add(url)
        seen_prefixes.add(prefix)
        unique.append(a)
    return unique


# ═════════════════════════════════════════════════════════════════════════════
# RSS feed fetcher (sync, run via executor)
# ═════════════════════════════════════════════════════════════════════════════

def _fetch_rss_sync(url: str, source_name: str, filter_keyword: str = "") -> list[dict]:
    """Fetch and parse a single RSS feed synchronously."""
    results = []
    try:
        feed = feedparser.parse(url)
        for entry in feed.entries[:8]:
            headline = getattr(entry, "title", "") or ""
            link = getattr(entry, "link", "") or ""

            # Apply keyword filter
            if filter_keyword and filter_keyword.lower() not in headline.lower():
                continue
            if not _is_financial_article(headline, link):
                continue

            image_url = _extract_image_from_summary(entry)
            published_at = _parse_rss_date(entry)
            sentiment = analyze_sentiment_free(headline)

            results.append({
                "headline": headline[:500],
                "source": source_name,
                "url": link,
                "published_at": published_at,
                "image_url": image_url,
                "sentiment_score": sentiment["score"],
                "sentiment_label": sentiment["label"],
            })
    except Exception as exc:
        logger.warning("RSS feed '%s' failed: %s", source_name, exc)
    return results


async def _fetch_rss(url: str, source_name: str, filter_keyword: str = "") -> list[dict]:
    """Async wrapper for RSS fetching."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        None, partial(_fetch_rss_sync, url, source_name, filter_keyword)
    )


async def _fetch_all_rss_feeds() -> list[dict]:
    """Fetch all configured RSS feeds concurrently."""
    tasks = [_fetch_rss(url, name) for name, url in RSS_FEEDS.items()]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    articles = []
    for r in results:
        if isinstance(r, list):
            articles.extend(r)
    return articles


async def _fetch_google_news_rss(query: str) -> list[dict]:
    """Fetch Google News RSS for a search query."""
    encoded = query.replace(" ", "+")
    url = f"https://news.google.com/rss/search?q={encoded}&hl=en-IN&gl=IN&ceid=IN:en"
    return await _fetch_rss(url, "Google News", "")


async def _fetch_all_google_news(queries: list[str]) -> list[dict]:
    """Fetch multiple Google News RSS queries concurrently."""
    tasks = [_fetch_google_news_rss(q) for q in queries]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    articles = []
    for r in results:
        if isinstance(r, list):
            articles.extend(r)
    return articles


# ═════════════════════════════════════════════════════════════════════════════
# NewsAPI fetcher (with strict keyword filter)
# ═════════════════════════════════════════════════════════════════════════════

async def _fetch_newsapi(
    query: str,
    page_size: int = 15,
) -> list[dict]:
    """Fetch from NewsAPI with financial keyword filtering."""
    api_key = settings.NEWS_API_KEY
    if not api_key:
        return []

    params = {
        "q": query,
        "language": "en",
        "pageSize": min(page_size, 100),
        "sortBy": "publishedAt",
        "apiKey": api_key,
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"{NEWS_API_BASE}/everything", params=params)
            resp.raise_for_status()
            data = resp.json()

        if data.get("status") != "ok":
            return []

        results = []
        for article in data.get("articles", []):
            headline = article.get("title", "")
            url = article.get("url", "")

            if not headline or headline == "[Removed]":
                continue
            if not _is_financial_article(headline, url):
                continue

            published_str = article.get("publishedAt")
            published_at = None
            if published_str:
                try:
                    published_at = datetime.fromisoformat(
                        published_str.replace("Z", "+00:00")
                    )
                except (ValueError, TypeError):
                    published_at = None

            sentiment = analyze_sentiment_free(headline)

            results.append({
                "headline": headline[:500],
                "source": article.get("source", {}).get("name"),
                "url": url,
                "published_at": published_at,
                "image_url": article.get("urlToImage"),
                "sentiment_score": sentiment["score"],
                "sentiment_label": sentiment["label"],
            })

        return results

    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 429:
            logger.warning("NewsAPI rate limited (429) for query '%s'", query)
        else:
            logger.error("NewsAPI HTTP %d for '%s'", exc.response.status_code, query)
        return []
    except Exception as exc:
        logger.error("NewsAPI fetch failed for '%s': %s", query, exc)
        return []


# ═════════════════════════════════════════════════════════════════════════════
# PUBLIC: Market news (multiple sources)
# ═════════════════════════════════════════════════════════════════════════════

async def fetch_market_news(page_size: int = 15) -> list[dict]:
    """
    Fetch general Indian stock market news from multiple sources.
    Sources: NewsAPI (rotating queries) + RSS feeds + Google News.
    All articles filtered to financial topics only.
    """
    from app.utils.cache import get_cached, set_cached
    cache_key = ("market_news", page_size)
    cached = get_cached(cache_key, 600)  # 10 minutes cache
    if cached is not None:
        return cached

    all_articles: list[dict] = []

    # 1. NewsAPI — use first 3 queries rotated
    import random
    queries = random.sample(MARKET_QUERIES, min(3, len(MARKET_QUERIES)))
    newsapi_tasks = [_fetch_newsapi(q, page_size=8) for q in queries]
    newsapi_results = await asyncio.gather(*newsapi_tasks, return_exceptions=True)
    for r in newsapi_results:
        if isinstance(r, list):
            all_articles.extend(r)

    # 2. RSS feeds
    rss_articles = await _fetch_all_rss_feeds()
    all_articles.extend(rss_articles)

    # 3. Google News RSS
    google_articles = await _fetch_all_google_news(GOOGLE_NEWS_MARKET_QUERIES)
    all_articles.extend(google_articles)

    # Deduplicate and sort by published_at
    all_articles = _deduplicate(all_articles)
    all_articles.sort(
        key=lambda x: x.get("published_at") or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )

    result = all_articles[:page_size]
    logger.info("Market news: %d articles from multi-source fetch", len(result))
    set_cached(cache_key, result)
    return result


# ═════════════════════════════════════════════════════════════════════════════
# PUBLIC: Company-specific news
# ═════════════════════════════════════════════════════════════════════════════

async def _fallback_yfinance_company_news(company_name: str, symbol: str) -> list[dict]:
    """yfinance news fallback for company-specific news."""
    try:
        import yfinance as yf
        loop = asyncio.get_running_loop()

        def _sync_news():
            return yf.Ticker(symbol).news or []

        yf_news = await loop.run_in_executor(None, _sync_news)
        if not yf_news:
            return _get_mock_company_news(company_name, symbol)

        results = []
        for n in yf_news[:10]:
            content = n.get("content", {})
            pub_date_str = content.get("pubDate")
            pub_date = None
            if pub_date_str:
                try:
                    pub_date = datetime.fromisoformat(pub_date_str.replace("Z", "+00:00"))
                except BaseException:
                    pub_date = datetime.now(timezone.utc)
            else:
                pub_date = datetime.now(timezone.utc)

            thumbnail = content.get("thumbnail", {}).get("originalUrl")
            if not thumbnail:
                resolutions = content.get("thumbnail", {}).get("resolutions", [])
                if resolutions:
                    thumbnail = resolutions[0].get("url")

            headline = content.get("title", f"{company_name} news update")[:500]
            sentiment = analyze_sentiment_free(headline)

            results.append({
                "headline": headline,
                "source": content.get("provider", {}).get("displayName", "Yahoo Finance"),
                "url": content.get("canonicalUrl", {}).get("url", ""),
                "published_at": pub_date,
                "image_url": thumbnail,
                "sentiment_score": sentiment["score"],
                "sentiment_label": sentiment["label"],
            })
        return results
    except Exception as e:
        logger.error("yfinance news fallback failed: %s", e)
        return _get_mock_company_news(company_name, symbol)


def _get_mock_company_news(company_name: str, symbol: str) -> list[dict]:
    """Last-resort mock news for company."""
    return [
        {
            "headline": f"{company_name} announces strong quarterly results, beats street estimates",
            "source": "Financial Express",
            "url": "https://financialexpress.com",
            "published_at": datetime.now(timezone.utc),
            "image_url": None,
            "sentiment_score": 0.6,
            "sentiment_label": "positive",
        },
        {
            "headline": f"{company_name} shares in focus amid broader market rally on positive global cues",
            "source": "The Economic Times",
            "url": "https://economictimes.indiatimes.com",
            "published_at": datetime.now(timezone.utc),
            "image_url": None,
            "sentiment_score": 0.3,
            "sentiment_label": "positive",
        },
    ]


async def fetch_company_news(
    company_name: str,
    symbol: str,
    page_size: int = 15,
) -> list[dict]:
    """
    Fetch company-specific news from multiple sources.

    Priority:
    1. NewsAPI: "{company_name} stock NSE"
    2. Google News RSS: "{company_name} share price"
    3. yfinance news
    All filtered and VADER-scored.
    """
    from app.utils.cache import get_cached, set_cached
    cache_key = ("company_news", symbol.upper(), page_size)
    cached = get_cached(cache_key, 600)  # 10 minutes cache
    if cached is not None:
        return cached

    all_articles: list[dict] = []

    # 1. NewsAPI (primary)
    newsapi_articles = await _fetch_newsapi(
        f"{company_name} stock NSE", page_size=page_size
    )
    all_articles.extend(newsapi_articles)

    # 2. Google News RSS (free, secondary)
    google_articles = await _fetch_google_news_rss(f"{company_name} share price India")
    # Filter by company name
    company_terms = [t.lower() for t in company_name.split() if len(t) > 3]
    filtered_google = [
        a for a in google_articles
        if any(term in (a.get("headline") or "").lower() for term in company_terms)
    ]
    all_articles.extend(filtered_google)

    # 3. yfinance fallback if not enough articles
    if len(all_articles) < 5:
        yf_articles = await _fallback_yfinance_company_news(company_name, symbol)
        all_articles.extend(yf_articles)

    # Deduplicate and sort
    all_articles = _deduplicate(all_articles)
    all_articles.sort(
        key=lambda x: x.get("published_at") or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )

    result = all_articles[:page_size]
    logger.info("Company news for '%s': %d articles", company_name, len(result))
    res_news = result or _get_mock_company_news(company_name, symbol)
    set_cached(cache_key, res_news)
    return res_news


def _get_mock_market_news() -> list[dict]:
    return [
        {
            "headline": "RBI likely to hold interest rates steady in upcoming MPC meet amid inflation concerns",
            "source": "The Economic Times",
            "url": "https://economictimes.indiatimes.com",
            "published_at": datetime.now(timezone.utc),
            "image_url": None,
            "sentiment_score": 0.0,
            "sentiment_label": "neutral",
        },
        {
            "headline": "Indian Equities consolidate as FII flows remain steady; Nifty eyes key support",
            "source": "Mint",
            "url": "https://livemint.com",
            "published_at": datetime.now(timezone.utc),
            "image_url": None,
            "sentiment_score": 0.1,
            "sentiment_label": "neutral",
        },
    ]


# ═════════════════════════════════════════════════════════════════════════════
# PERSISTENCE — store fetched news into PostgreSQL
# ═════════════════════════════════════════════════════════════════════════════

async def persist_company_news(
    company_name: str,
    symbol: str,
    page_size: int = 10,
    session: AsyncSession | None = None,
) -> int:
    """
    Fetch and persist company news to the database.
    Deduplicates by URL and headline prefix.
    """
    articles = await fetch_company_news(company_name, symbol, page_size)
    if not articles:
        return 0

    own_session = session is None
    if own_session:
        session = async_session_factory()

    try:
        result = await session.execute(
            select(Company).where(Company.symbol == symbol)
        )
        company = result.scalar_one_or_none()
        if not company:
            logger.warning("Company %s not found in DB — skipping news persist", symbol)
            return 0

        existing_result = await session.execute(
            select(News.url, News.headline).where(News.company_id == company.id)
        )
        existing_rows = existing_result.all()
        existing_urls: set[str] = {row[0] for row in existing_rows if row[0]}
        existing_prefixes: set[str] = {(row[1] or "")[:50].lower() for row in existing_rows}

        new_articles: list[News] = []
        for article in articles:
            url = article.get("url") or ""
            headline = article.get("headline") or ""
            prefix = headline[:50].lower()

            if url and url in existing_urls:
                continue
            if prefix and prefix in existing_prefixes:
                continue

            new_articles.append(News(
                company_id=company.id,
                headline=headline,
                source=article.get("source"),
                url=url or None,
                published_at=article.get("published_at"),
                sentiment_score=article.get("sentiment_score"),
                sentiment_label=article.get("sentiment_label"),
            ))

        if new_articles:
            session.add_all(new_articles)
            if own_session:
                await session.commit()
            logger.info("Persisted %d new articles for %s", len(new_articles), symbol)
        else:
            logger.info("No new articles to persist for %s", symbol)

        return len(new_articles)

    except Exception as exc:
        logger.error("Failed to persist news for %s: %s", symbol, exc)
        if own_session:
            await session.rollback()
        return 0
    finally:
        if own_session:
            await session.close()
