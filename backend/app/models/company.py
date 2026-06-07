"""
Company ORM model — core entity for every tracked stock / organization.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    symbol: Mapped[str] = mapped_column(
        String(30), unique=True, nullable=False, index=True,
        comment="Ticker symbol, e.g. RELIANCE.NS",
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    exchange: Mapped[str] = mapped_column(
        String(20), nullable=False, comment="NSE, BSE, NYSE, NASDAQ …"
    )
    sector: Mapped[str | None] = mapped_column(String(100))
    industry: Mapped[str | None] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text)
    ceo: Mapped[str | None] = mapped_column(String(150))
    founded_year: Mapped[int | None] = mapped_column()
    headquarters: Mapped[str | None] = mapped_column(String(200))
    website: Mapped[str | None] = mapped_column(String(300))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # ── Relationships ────────────────────────────────────────────────────
    stock_prices = relationship("StockPrice", back_populates="company", lazy="selectin")
    financials = relationship("Financial", back_populates="company", lazy="selectin")
    ownership_records = relationship("Ownership", back_populates="company", lazy="selectin")
    news_articles = relationship("News", back_populates="company", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Company {self.symbol} — {self.name}>"
