"""
ResearchItem ORM model — maps to 'research_list' table.
Tracks which stocks a user is following for deep AI research.
"""

import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class ResearchItem(Base):
    """Maps to 'research_list' table."""

    __tablename__ = "research_list"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    stock_symbol = Column(String(30), nullable=False, index=True)

    # Denormalized for quick display
    company_name = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_analyzed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationship
    user = relationship("UserNotification", back_populates="research_items")

    def __repr__(self) -> str:
        return f"<ResearchItem user={self.user_id} symbol={self.stock_symbol}>"
