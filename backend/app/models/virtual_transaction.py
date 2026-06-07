"""
VirtualTransaction ORM model — immutable trade log.
One row per BUY or SELL action. Never updated, only inserted.
"""

import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class VirtualTransaction(Base):
    __tablename__ = "virtual_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(255), nullable=False, index=True)
    account_id = Column(
        UUID(as_uuid=True),
        ForeignKey("virtual_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    stock_symbol     = Column(String(30), nullable=False, index=True)
    company_name     = Column(String(255), nullable=True)
    transaction_type = Column(String(4), nullable=False,
                              comment="BUY | SELL")
    quantity         = Column(Integer, nullable=False)
    price            = Column(Numeric(12, 4), nullable=False,
                              comment="Price per share at execution")
    total_value      = Column(Numeric(15, 2), nullable=False,
                              comment="quantity × price")
    realized_pnl     = Column(Numeric(15, 2), nullable=False, default=0.00,
                              comment="Realized P&L on SELL; 0 for BUY")

    timestamp = Column(DateTime(timezone=True), server_default=func.now(),
                       nullable=False, index=True)

    # Relationship
    account = relationship("VirtualAccount", back_populates="transactions")

    def __repr__(self) -> str:
        return (
            f"<VirtualTransaction {self.transaction_type} "
            f"{self.stock_symbol} qty={self.quantity} @{self.price}>"
        )
