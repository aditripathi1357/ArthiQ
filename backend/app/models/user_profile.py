"""
UserProfile ORM model — stores notification settings per user.
Keyed by Supabase user_id (UUID string, not a FK to avoid coupling).
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # Supabase auth user ID (stored as string to avoid tight coupling)
    user_id: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True,
        comment="Supabase auth.users.id",
    )
    email: Mapped[str | None] = mapped_column(String(320), index=True)
    whatsapp_number: Mapped[str | None] = mapped_column(
        String(20),
        comment="E.164 format, e.g. +919876543210",
    )

    # JSONB blob for flexible preference storage
    # Example:
    # {
    #   "market_news": true,
    #   "company_news": true,
    #   "earnings_updates": true,
    #   "dividend_updates": true,
    #   "price_alerts": false,
    #   "ai_research_reports": true,
    #   "corporate_actions": true
    # }
    notification_preferences: Mapped[dict | None] = mapped_column(
        JSONB,
        default=lambda: {
            "market_news": True,
            "company_news": True,
            "earnings_updates": True,
            "dividend_updates": True,
            "price_alerts": False,
            "ai_research_reports": True,
            "corporate_actions": True,
        },
    )

    # Delivery channels enabled
    email_enabled: Mapped[bool] = mapped_column(default=True)
    whatsapp_enabled: Mapped[bool] = mapped_column(default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    def __repr__(self) -> str:
        return f"<UserProfile user={self.user_id} email={self.email}>"
