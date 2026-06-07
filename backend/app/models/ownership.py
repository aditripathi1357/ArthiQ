"""
Ownership ORM model — shareholding pattern breakdown.
"""

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Ownership(Base):
    __tablename__ = "ownership"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )

    as_of_date: Mapped[date] = mapped_column(Date, nullable=False)

    promoter_pct: Mapped[float | None] = mapped_column(Numeric(6, 2))
    fii_pct: Mapped[float | None] = mapped_column(Numeric(6, 2), comment="Foreign Institutional Investors")
    dii_pct: Mapped[float | None] = mapped_column(Numeric(6, 2), comment="Domestic Institutional Investors")
    retail_pct: Mapped[float | None] = mapped_column(Numeric(6, 2))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Relationships ────────────────────────────────────────────────────
    company = relationship("Company", back_populates="ownership_records")

    def __repr__(self) -> str:
        return f"<Ownership {self.company_id} as_of {self.as_of_date}>"
