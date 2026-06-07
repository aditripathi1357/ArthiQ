"""
MonthlyLeaderboard ORM model — one row per (user_id, month, year).
Updated periodically by the scheduler and on each trade.
"""

import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class MonthlyLeaderboard(Base):
    __tablename__ = "monthly_leaderboard"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(255), nullable=False, index=True)
    account_id = Column(
        UUID(as_uuid=True),
        ForeignKey("virtual_accounts.id", ondelete="CASCADE"),
        nullable=False,
    )

    display_name      = Column(String(100), nullable=True,
                               comment="Email prefix shown on leaderboard")
    month             = Column(Integer, nullable=False)
    year              = Column(Integer, nullable=False)
    starting_balance  = Column(Numeric(15, 2), nullable=False, default=100_000.00)
    portfolio_value   = Column(Numeric(15, 2), nullable=False, default=100_000.00)
    return_percentage = Column(Numeric(8, 4), nullable=False, default=0.0000)
    rank              = Column(Integer, nullable=True)

    updated_at = Column(DateTime(timezone=True), server_default=func.now(),
                        onupdate=func.now(), nullable=False)

    # Relationship
    account = relationship("VirtualAccount", back_populates="leaderboard_entries")

    def __repr__(self) -> str:
        return (
            f"<MonthlyLeaderboard user={self.user_id} "
            f"{self.month}/{self.year} return={self.return_percentage}%>"
        )
