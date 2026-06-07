"""
VirtualHolding ORM model — one row per (user, symbol) open position.
Tracks quantity and average buy price for unrealized P&L calculation.
"""

import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class VirtualHolding(Base):
    __tablename__ = "virtual_holdings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(255), nullable=False, index=True)
    account_id = Column(
        UUID(as_uuid=True),
        ForeignKey("virtual_accounts.id", ondelete="CASCADE"),
        nullable=False,
    )

    stock_symbol  = Column(String(30), nullable=False, index=True)
    company_name  = Column(String(255), nullable=True)
    quantity      = Column(Integer, nullable=False, default=0)
    average_price = Column(Numeric(12, 4), nullable=False, default=0.0)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(),
                        onupdate=func.now(), nullable=False)

    # Relationships
    account = relationship("VirtualAccount", back_populates="holdings")

    @property
    def invested_value(self) -> float:
        return float(self.quantity) * float(self.average_price)

    def unrealized_pnl(self, current_price: float) -> float:
        return (current_price - float(self.average_price)) * float(self.quantity)

    def unrealized_pnl_pct(self, current_price: float) -> float:
        if float(self.average_price) == 0:
            return 0.0
        return ((current_price - float(self.average_price)) / float(self.average_price)) * 100

    def __repr__(self) -> str:
        return f"<VirtualHolding user={self.user_id} {self.stock_symbol} qty={self.quantity}>"
