"""
News ORM model — articles linked to companies with AI sentiment scores.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class News(Base):
    __tablename__ = "news"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )

    headline: Mapped[str] = mapped_column(String(500), nullable=False)
    source: Mapped[str | None] = mapped_column(String(200))
    url: Mapped[str | None] = mapped_column(Text)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # ── AI Sentiment ─────────────────────────────────────────────────────
    sentiment_score: Mapped[float | None] = mapped_column(
        Numeric(4, 3), comment="Range -1.000 (bear) to +1.000 (bull)"
    )
    sentiment_label: Mapped[str | None] = mapped_column(
        String(10), comment="positive | negative | neutral"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Relationships ────────────────────────────────────────────────────
    company = relationship("Company", back_populates="news_articles")

    def __repr__(self) -> str:
        return f"<News '{self.headline[:40]}…' ({self.sentiment_label})>"
