"""
Pydantic schemas for Market-level endpoints (indices, top movers, all stocks).
"""

from datetime import datetime

from pydantic import BaseModel, Field


# ═════════════════════════════════════════════════════════════════════════════
# Index data
# ═════════════════════════════════════════════════════════════════════════════

class IndexData(BaseModel):
    """Live data for a single market index."""

    name: str = Field(..., examples=["NIFTY 50"])
    symbol: str = Field(..., examples=["^NSEI"])
    value: float | None = None
    change: float | None = None
    change_pct: float | None = None
    day_high: float | None = None
    day_low: float | None = None


class IndicesResponse(BaseModel):
    """Response for market indices endpoint."""

    indices: list[IndexData]
    total: int


# ═════════════════════════════════════════════════════════════════════════════
# Stock list item (for market-wide listings)
# ═════════════════════════════════════════════════════════════════════════════

class StockListItem(BaseModel):
    """A single stock in a market listing."""

    symbol: str
    name: str
    series: str | None = None
    price: float | None = None
    open: float | None = None
    high: float | None = None
    low: float | None = None
    close: float | None = None
    volume: int | None = None
    previous_close: float | None = None
    change: float | None = None
    change_pct: float | None = None


class PaginatedStockList(BaseModel):
    """Paginated response for stock listings."""

    stocks: list[StockListItem]
    total: int
    page: int
    per_page: int
    total_pages: int


# ═════════════════════════════════════════════════════════════════════════════
# Top movers
# ═════════════════════════════════════════════════════════════════════════════

class TopMoversResponse(BaseModel):
    """Top gainers, losers, or most active stocks."""

    stocks: list[StockListItem]
    total: int
    category: str = Field(..., examples=["gainers", "losers", "active"])


# ═════════════════════════════════════════════════════════════════════════════
# Sectors
# ═════════════════════════════════════════════════════════════════════════════

class SectorData(BaseModel):
    """A single market sector."""

    name: str
    company_count: int


class SectorsResponse(BaseModel):
    """Response for sectors endpoint."""

    sectors: list[SectorData]
    total: int


# ═════════════════════════════════════════════════════════════════════════════
# Market overview (combined response)
# ═════════════════════════════════════════════════════════════════════════════

class MarketOverview(BaseModel):
    """Combined market overview with indices and key stats."""

    total_companies: int
    indices: list[IndexData]
    is_market_open: bool = False
    last_updated: datetime | None = None
