"""
Pydantic schemas for Stock Prices, Forex, and Chart data.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# ═════════════════════════════════════════════════════════════════════════════
# Stock Quote (live)
# ═════════════════════════════════════════════════════════════════════════════

class StockQuote(BaseModel):
    """Live price quote for a single symbol."""

    symbol: str
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float
    previous_close: float | None = None
    change: float | None = None
    change_pct: float | None = None
    price: float | None = None
    market_cap: float | None = None
    pe_ratio: float | None = None
    week_52_low: float | None = None
    week_52_high: float | None = None
    source: str = "yfinance"


# ═════════════════════════════════════════════════════════════════════════════
# Stock Price (DB-backed)
# ═════════════════════════════════════════════════════════════════════════════

class StockPriceBase(BaseModel):
    company_id: uuid.UUID
    timestamp: datetime
    open: float = Field(..., ge=0)
    high: float = Field(..., ge=0)
    low: float = Field(..., ge=0)
    close: float = Field(..., ge=0)
    volume: float = Field(..., ge=0)
    is_live: bool = False


class StockPriceCreate(StockPriceBase):
    """Incoming stock price record."""
    pass


class StockPriceResponse(StockPriceBase):
    """Stock price returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime


class StockPriceListResponse(BaseModel):
    """Time-series stock price response."""

    symbol: str
    total: int
    items: list[StockPriceResponse]


# ═════════════════════════════════════════════════════════════════════════════
# History (OHLCV)
# ═════════════════════════════════════════════════════════════════════════════

class OHLCVBar(BaseModel):
    """Single OHLCV bar for history or charting."""

    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float


class StockHistoryResponse(BaseModel):
    """Historical OHLCV data for a symbol."""

    symbol: str
    period: str
    interval: str
    total: int
    bars: list[OHLCVBar]
    source: str = "yfinance"


# ═════════════════════════════════════════════════════════════════════════════
# Chart (simplified price array)
# ═════════════════════════════════════════════════════════════════════════════

class ChartPoint(BaseModel):
    """Simplified price point for frontend charts."""

    t: datetime = Field(..., description="Timestamp")
    p: float = Field(..., description="Close price")
    v: float = Field(..., description="Volume")


class StockChartResponse(BaseModel):
    """Lightweight chart data for frontend rendering."""

    symbol: str
    period: str
    total: int
    data: list[ChartPoint]


# ═════════════════════════════════════════════════════════════════════════════
# Forex
# ═════════════════════════════════════════════════════════════════════════════

class ForexRateItem(BaseModel):
    """Single currency pair rate."""

    base: str = Field(..., examples=["USD"])
    target: str = Field(..., examples=["INR"])
    rate: float
    fetched_at: datetime


class ForexRatesResponse(BaseModel):
    """Batch forex rates response."""

    base: str
    total: int
    rates: dict[str, float]
    fetched_at: datetime | None = None
    source: str = "exchangerate-api"


class ForexPairResponse(BaseModel):
    """Single forex pair response."""

    pair: str = Field(..., examples=["USD-INR"])
    base: str
    target: str
    rate: float
    fetched_at: datetime | None = None
    source: str = "database"
