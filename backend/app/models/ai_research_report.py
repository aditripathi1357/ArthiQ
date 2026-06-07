"""
AIResearchReport ORM model — maps to 'ai_research_reports' table.
One row per stock symbol; updated on each analysis cycle.
"""

import uuid

from sqlalchemy import Column, DateTime, Float, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class AIResearchReport(Base):
    """Maps to 'ai_research_reports' table."""

    __tablename__ = "ai_research_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_symbol = Column(String(30), nullable=False, index=True)
    company_name = Column(String(255), nullable=True)

    # Core AI-generated fields
    summary = Column(Text, nullable=False, default="")
    sentiment = Column(String(20), nullable=False, default="neutral",
                       comment="positive | neutral | negative")
    impact_level = Column(String(20), nullable=False, default="neutral",
                          comment="bullish | neutral | bearish")
    short_term_outlook = Column(Text, nullable=False, default="")
    confidence_score = Column(
        Numeric(precision=5, scale=2), nullable=False, default=0.50,
        comment="0.00 – 1.00; display as percentage"
    )

    # Detailed supporting data (stored as text JSON to avoid JSONB dependency)
    raw_data_json = Column(Text, nullable=True)

    # Notification flag — prevents duplicate sends within same cycle
    notification_sent = Column(
        String(5), nullable=False, default="false",
        comment="'true' | 'false' — reset each cycle"
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self) -> str:
        return (
            f"<AIResearchReport {self.company_symbol} "
            f"sentiment={self.sentiment} confidence={self.confidence_score}>"
        )

    @property
    def confidence_pct(self) -> int:
        """Confidence as integer percentage (0–100)."""
        try:
            return int(float(self.confidence_score) * 100)
        except (TypeError, ValueError):
            return 50
