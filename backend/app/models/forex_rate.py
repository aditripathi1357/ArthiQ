"""
ForexRate ORM model — stores fetched currency exchange rates.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ForexRate(Base):
    __tablename__ = "forex_rates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    base_currency: Mapped[str] = mapped_column(
        String(5), nullable=False, index=True, comment="e.g. USD"
    )
    target_currency: Mapped[str] = mapped_column(
        String(5), nullable=False, index=True, comment="e.g. INR"
    )
    rate: Mapped[float] = mapped_column(
        Numeric(18, 6), nullable=False
    )

    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<ForexRate {self.base_currency}/{self.target_currency} = {self.rate}>"
