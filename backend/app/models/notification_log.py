"""
NotificationEntry ORM model — maps to 'notifications' table.
Audit trail for every notification sent (email / WhatsApp).
"""

import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class NotificationEntry(Base):
    """Maps to 'notifications' table."""

    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type = Column(
        String(50), nullable=False, index=True,
        comment="research_report | earnings | dividend | breaking_news | daily_digest",
    )
    symbol = Column(String(30), nullable=True, index=True)
    channel = Column(String(20), nullable=False,
                     comment="email | whatsapp")
    title = Column(String(255), nullable=False, default="")
    message = Column(Text, nullable=False, default="")
    status = Column(
        String(20), nullable=False, default="pending",
        comment="pending | sent | failed",
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationship
    user = relationship("UserNotification", back_populates="notification_entries")

    def __repr__(self) -> str:
        return (
            f"<NotificationEntry user={self.user_id} "
            f"type={self.type} channel={self.channel} status={self.status}>"
        )
