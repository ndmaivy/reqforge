from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserNeedEvidenceReview(Base):
    __tablename__ = "user_need_evidence_reviews"
    __table_args__ = (
        UniqueConstraint("user_id", "need_id", name="uq_user_need_evidence_review"),
        Index("ix_user_need_evidence_reviews_need_id", "need_id"),
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    need_id: Mapped[UUID] = mapped_column(
        ForeignKey("user_needs.id", ondelete="CASCADE"), primary_key=True
    )
    last_reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
