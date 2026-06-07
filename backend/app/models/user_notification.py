"""
UserNotification ORM model — maps to the 'users' table created by Alembic migration.
Stores per-user notification preferences (email, WhatsApp, preference toggles).
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, String, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import relationship

from app.database import Base


class UserNotification(Base):
    """Maps to the 'users' table (notification-specific user record)."""

    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False, unique=True, index=True)
    whatsapp_number = Column(String(30), nullable=True)

    # JSON blob for notification preference toggles
    # {
    #   "market_news": true, "company_news": true,
    #   "earnings_updates": true, "dividend_updates": true,
    #   "price_alerts": false, "ai_research_reports": true,
    #   "corporate_actions": true
    # }
    notification_preferences = Column(
        JSON,
        nullable=False,
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

    # Supabase user_id for linking (stored separately from email PK)
    supabase_user_id = Column(String(255), unique=True, nullable=True, index=True)

    # Channel toggles
    email_enabled = Column(Boolean, default=True, nullable=False)
    whatsapp_enabled = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    research_items = relationship("ResearchItem", back_populates="user", cascade="all, delete-orphan")
    notification_entries = relationship("NotificationEntry", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<UserNotification {self.email}>"

    def get_pref(self, key: str, default: bool = True) -> bool:
        """Safe preference lookup with default."""
        prefs = self.notification_preferences or {}
        return prefs.get(key, default)
