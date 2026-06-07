"""
Pydantic schemas for Company-related endpoints.
"""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


# ═════════════════════════════════════════════════════════════════════════════
# Company base / CRUD
# ═════════════════════════════════════════════════════════════════════════════

class CompanyBase(BaseModel):
    """Fields shared across create / update / response."""

    symbol: str = Field(..., max_length=30, examples=["RELIANCE.NS"])
    name: str = Field(..., max_length=255, examples=["Reliance Industries Limited"])
    exchange: str = Field(..., max_length=20, examples=["NSE"])
    sector: str | None = Field(None, max_length=100)
    industry: str | None = Field(None, max_length=100)
    description: str | None = None
    ceo: str | None = Field(None, max_length=150)
    founded_year: int | None = Field(None, ge=1600, le=2100)
    headquarters: str | None = Field(None, max_length=200)
    website: str | None = Field(None, max_length=300)


class CompanyCreate(CompanyBase):
    """Request body for creating a new company."""
    pass


class CompanyUpdate(BaseModel):
    """Partial update -- all fields optional."""

    symbol: str | None = Field(None, max_length=30)
    name: str | None = Field(None, max_length=255)
    exchange: str | None = Field(None, max_length=20)
    sector: str | None = Field(None, max_length=100)
    industry: str | None = Field(None, max_length=100)
    description: str | None = None
    ceo: str | None = Field(None, max_length=150)
    founded_year: int | None = Field(None, ge=1600, le=2100)
    headquarters: str | None = Field(None, max_length=200)
    website: str | None = Field(None, max_length=300)


class CompanyResponse(CompanyBase):
    """Full company object returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class CompanyListResponse(BaseModel):
    """Paginated list of companies."""

    total: int
    page: int
    per_page: int
    items: list[CompanyResponse]


# ═════════════════════════════════════════════════════════════════════════════
# Search
# ═════════════════════════════════════════════════════════════════════════════

class CompanySearchResult(BaseModel):
    """Lightweight search result item."""

    symbol: str
    name: str
    exchange: str
    sector: str | None = None
    industry: str | None = None


class CompanySearchResponse(BaseModel):
    """Search results wrapper."""

    query: str
    total: int
    results: list[CompanySearchResult]


# ═════════════════════════════════════════════════════════════════════════════
# Overview (company + live price snapshot)
# ═════════════════════════════════════════════════════════════════════════════

class CompanyOverview(BaseModel):
    """Quick overview: name + live price + sector + market cap."""

    symbol: str
    name: str
    exchange: str
    sector: str | None = None
    industry: str | None = None
    current_price: float | None = None
    previous_close: float | None = None
    change: float | None = None
    change_pct: float | None = None
    day_high: float | None = None
    day_low: float | None = None
    open: float | None = None
    fifty_two_week_low: float | None = None
    fifty_two_week_high: float | None = None
    volume: float | None = None
    average_volume: float | None = None
    market_cap: float | None = None
    pe_ratio: float | None = None
    eps: float | None = None
    beta: float | None = None
    dividend_yield: float | None = None
    dividend_rate: float | None = None


# ═════════════════════════════════════════════════════════════════════════════
# Financials
# ═════════════════════════════════════════════════════════════════════════════

class FinancialData(BaseModel):
    """Single financial period data."""

    model_config = ConfigDict(from_attributes=True)

    period_type: str | None = None
    period_end_date: date | None = None
    revenue: float | None = None
    net_profit: float | None = None
    ebitda: float | None = None
    total_debt: float | None = None
    total_equity: float | None = None
    pe_ratio: float | None = None
    roe: float | None = None
    debt_to_equity: float | None = None


class CompanyFinancialsResponse(BaseModel):
    """Financial data for a company."""

    symbol: str
    name: str
    financials: list[FinancialData]
    source: str = "database"


# ═════════════════════════════════════════════════════════════════════════════
# Ownership
# ═════════════════════════════════════════════════════════════════════════════

class OwnershipData(BaseModel):
    """Shareholding breakdown."""

    model_config = ConfigDict(from_attributes=True)

    as_of_date: date | None = None
    promoter_pct: float | None = None
    fii_pct: float | None = None
    dii_pct: float | None = None
    retail_pct: float | None = None


class CompanyOwnershipResponse(BaseModel):
    """Ownership data for a company."""

    symbol: str
    name: str
    ownership: OwnershipData | None = None
    source: str = "database"
