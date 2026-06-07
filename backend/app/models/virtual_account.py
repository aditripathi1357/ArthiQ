"""
VirtualAccount ORM model — one record per user.
Holds the virtual cash balance and aggregate portfolio metrics.
Auto-creates with ₹1,00,000 on first access; resets on the 1st of each month.
"""

import uuid
from datetime import date, datetime

from sqlalchemy import Column, Date, DateTime, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class VirtualAccount(Base):
    __tablename__ = "virtual_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(255), nullable=False, unique=True, index=True,
                     comment="Supabase auth.users.id")

    # ── Financials ──────────────────────────────────────────────────────
    cash_balance    = Column(Numeric(15, 2), nullable=False, default=100_000.00)
    invested_amount = Column(Numeric(15, 2), nullable=False, default=0.00)
    portfolio_value = Column(Numeric(15, 2), nullable=False, default=100_000.00)
    realized_pnl    = Column(Numeric(15, 2), nullable=False, default=0.00)

    # ── Monthly reset ────────────────────────────────────────────────────
    reset_date = Column(Date, nullable=False, default=date.today,
                        comment="Date of last monthly reset")

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(),
                        onupdate=func.now(), nullable=False)

    # Relationships
    holdings     = relationship("VirtualHolding",     back_populates="account",
                                cascade="all, delete-orphan")
    transactions = relationship("VirtualTransaction", back_populates="account",
                                cascade="all, delete-orphan")
    leaderboard_entries = relationship("MonthlyLeaderboard", back_populates="account",
                                       cascade="all, delete-orphan")

    @property
    def total_value(self) -> float:
        """Total account value = cash + invested (before current prices applied)."""
        return float(self.cash_balance) + float(self.invested_amount)

    def __repr__(self) -> str:
        return f"<VirtualAccount user={self.user_id} cash={self.cash_balance}>"
