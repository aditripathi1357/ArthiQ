"""
Financial ORM model — quarterly & annual financial statements.
"""

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Financial(Base):
    __tablename__ = "financials"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )

    period_type: Mapped[str] = mapped_column(
        String(10), nullable=False, comment="quarterly | annual"
    )
    period_end_date: Mapped[date] = mapped_column(Date, nullable=False)

    # ── Income statement ─────────────────────────────────────────────────
    revenue: Mapped[float | None] = mapped_column(Numeric(20, 2))
    net_profit: Mapped[float | None] = mapped_column(Numeric(20, 2))
    ebitda: Mapped[float | None] = mapped_column(Numeric(20, 2))

    # ── Balance sheet ────────────────────────────────────────────────────
    total_debt: Mapped[float | None] = mapped_column(Numeric(20, 2))
    total_equity: Mapped[float | None] = mapped_column(Numeric(20, 2))

    # ── Ratios ───────────────────────────────────────────────────────────
    pe_ratio: Mapped[float | None] = mapped_column(Numeric(10, 4))
    roe: Mapped[float | None] = mapped_column(Numeric(10, 4))
    debt_to_equity: Mapped[float | None] = mapped_column(Numeric(10, 4))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Relationships ────────────────────────────────────────────────────
    company = relationship("Company", back_populates="financials")

    def __repr__(self) -> str:
        return f"<Financial {self.company_id} {self.period_type} {self.period_end_date}>"
