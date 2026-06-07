"""
CompanyRelationship ORM model — maps parent ↔ child business connections.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CompanyRelationship(Base):
    __tablename__ = "company_relationships"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    parent_company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    child_company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    relationship_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        comment="subsidiary | competitor | investor | supply_chain",
    )
    ownership_pct: Mapped[float | None] = mapped_column(
        Numeric(6, 2), comment="Ownership stake (nullable for non-equity links)"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Relationships ────────────────────────────────────────────────────
    parent_company = relationship(
        "Company", foreign_keys=[parent_company_id], lazy="selectin"
    )
    child_company = relationship(
        "Company", foreign_keys=[child_company_id], lazy="selectin"
    )

    def __repr__(self) -> str:
        return (
            f"<CompanyRelationship {self.parent_company_id} "
            f"—[{self.relationship_type}]→ {self.child_company_id}>"
        )
