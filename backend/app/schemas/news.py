"""
Pydantic schemas for News articles, Sentiment, and AI Insights.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# ═════════════════════════════════════════════════════════════════════════════
# News articles
# ═════════════════════════════════════════════════════════════════════════════

class NewsArticle(BaseModel):
    """Single news article (from live API or database)."""

    headline: str
    source: str | None = None
    url: str | None = None
    published_at: datetime | None = None
    sentiment_score: float | None = Field(None, ge=-1, le=1)
    sentiment_label: str | None = None
    image_url: str | None = None  # urlToImage from NewsAPI


class NewsBase(BaseModel):
    company_id: uuid.UUID
    headline: str = Field(..., max_length=500)
    source: str | None = Field(None, max_length=200)
    url: str | None = None
    published_at: datetime | None = None
    sentiment_score: float | None = Field(None, ge=-1, le=1)
    sentiment_label: str | None = Field(None, pattern="^(positive|negative|neutral)$")


class NewsCreate(NewsBase):
    """Incoming news article."""
    pass


class NewsResponse(NewsBase):
    """News article returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime


class NewsListResponse(BaseModel):
    """Paginated news list."""

    total: int
    page: int
    per_page: int
    items: list[NewsResponse]


# ═════════════════════════════════════════════════════════════════════════════
# Company news (symbol-based, for router)
# ═════════════════════════════════════════════════════════════════════════════

class CompanyNewsResponse(BaseModel):
    """News articles for a specific company."""

    symbol: str
    total: int
    articles: list[NewsArticle]
    source: str = "newsapi"


class MarketNewsResponse(BaseModel):
    """General market news."""

    total: int
    articles: list[NewsArticle]
    source: str = "newsapi"


# ═════════════════════════════════════════════════════════════════════════════
# Sentiment summary
# ═════════════════════════════════════════════════════════════════════════════

class SentimentSummary(BaseModel):
    """Aggregated sentiment stats for a company's news."""

    symbol: str
    total_articles: int
    avg_sentiment_score: float | None = None
    positive_count: int = 0
    negative_count: int = 0
    neutral_count: int = 0
    overall_label: str = "neutral"


# ═════════════════════════════════════════════════════════════════════════════
# AI Insights
# ═════════════════════════════════════════════════════════════════════════════

class InsightRequest(BaseModel):
    """Request for AI-generated price-movement explanation."""

    symbol: str = Field(..., examples=["RELIANCE.NS"])
    date: str | None = Field(None, description="ISO date, defaults to today")


class InsightResponse(BaseModel):
    """AI-generated explanation of a stock move."""

    symbol: str
    date: str
    price_change_pct: float
    explanation: str
    key_factors: list[str]
    sentiment_summary: str
    generated_at: datetime


class WhyMovedResponse(BaseModel):
    """AI explanation of why a stock price moved."""

    symbol: str
    date: str
    price_change_pct: float | None = None
    explanation: str
    key_factors: list[str]
    recent_news: list[str]
    generated_at: datetime
    source: str = "ai-placeholder"


class StockSummaryResponse(BaseModel):
    """AI-generated summary with signal and risk level."""

    symbol: str
    signal: str = Field(..., description="buy | sell | hold")
    risk_level: str = Field(..., description="low | medium | high")
    confidence: float = Field(..., ge=0, le=1)
    reasoning: str
    key_metrics: dict[str, float | str | None]
    generated_at: datetime
    source: str = "ai-placeholder"
